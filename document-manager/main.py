import os
import io
import numpy as np
import pandas as pd
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from parser import ParserTXT, ParserPDF, ParserPPTX, ParserPDFImage, ParserImage
from chunker import RuleBasedTextChunker, LLMBasedTextChunker, LLMBasedImageChunker
from embedder import HuggingFaceEmbedder, OpenAIEmbedder
from sqlalchemy.orm import Session
from pymilvus import Collection
import database
import schemas
from dotenv import load_dotenv  
from typing import List
import uuid
load_dotenv()

# Create embedding model
if os.getenv("EMBEDDING_MODEL_TYPE") == "openai":
    embedder = OpenAIEmbedder(os.getenv("EMBEDDING_MODEL_ID"), embed_dim=int(os.getenv("EMBEDDING_DIMENSION")))
else:
    embedder = HuggingFaceEmbedder(os.getenv("EMBEDDING_MODEL_ID"), embed_dim=int(os.getenv("EMBEDDING_DIMENSION")))

# Create FastAPI App
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv('BACKEND_URL')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def fn_insert_vector(data, doc_id, collection):
    try:
        df = pd.DataFrame(data)
        df["id"] = [uuid.uuid4().hex for _ in range(len(df))]
        df["doc_id"] = doc_id
        df["vector"] = embedder.embed(df["chunk_content"].to_list())
        collection.insert(df[[col.name for col in database.fields]])
        return True
    except Exception as e:
        print(f"ERROR in fn_insert_vector -> msg={e}")
        return False

async def fn_update_progress(data, doc_id, total_chunks, max_progress_value, db):
    try:
        doc = db.query(database.Documents).filter(
            database.Documents.id == doc_id,
        ).first()
        if data is not None:
            doc.progress += int((len(data) / total_chunks) * max_progress_value)
        else:
            doc.progress += int(max_progress_value - doc.progress)
        db.commit()
        return True
    except Exception as e:
        print(f"ERROR in fn_update_progress -> msg={e}")
        db.rollback()
        return False

async def fn_process(page_conatiner, chunkers, doc_id, db, collection, batch_size=4):
    max_progress_value = 100.0 / len(chunkers)
    for idx, chunker in enumerate(chunkers):
        chunk_generator = chunker.chunk(page_conatiner)
        total_chunks = next(chunk_generator)
        # chunking, embedding, loading
        data = []
        for chunk in chunk_generator:
            data.append(chunk)
            if len(data) >= batch_size:
                # Insert vector
                if await fn_insert_vector(data, doc_id, collection):
                    # Update progress
                    await fn_update_progress(data, doc_id, total_chunks, max_progress_value, db)
                data = []
        if data:
            # Insert vector
            if await fn_insert_vector(data, doc_id, collection):
                # Update progress
                await fn_update_progress(None, doc_id, total_chunks, max_progress_value * (idx + 1), db)

@app.post("/api/document-manager/process-document")
async def process_document(
    file: UploadFile = File(...),
    extension: str = Form(...),
    proc_type: str = Form(...),
    doc_id: int = Form(...),
    db: Session = Depends(database.GetRDB),
    collection: Collection = Depends(database.GetVectorDB)
):  
    print(f"extension={extension}, proc_type={proc_type}, doc_id={doc_id}")
    if proc_type == "text":
        if extension in ["txt"]:
            parser = ParserTXT()
            chunkers = [RuleBasedTextChunker(), LLMBasedTextChunker(llm_model_type=os.getenv("CHUNK_MODEL_TYPE"), llm_model_name=os.getenv("CHUNK_MODEL_NAME"))]
        elif extension in ["pdf"]:
            parser = ParserPDF()
            chunkers = [RuleBasedTextChunker(), LLMBasedTextChunker(llm_model_type=os.getenv("CHUNK_MODEL_TYPE"), llm_model_name=os.getenv("CHUNK_MODEL_NAME"))]
        else:
            raise HTTPException(status_code=400, detail=f"Invalid file extension (extension={extension}, proc_type={proc_type})")
    elif proc_type == "image":
        if extension in ["pptx"]:
            parser = ParserPPTX()
            chunkers = [LLMBasedImageChunker(llm_model_type=os.getenv("CHUNK_MODEL_TYPE"), llm_model_name=os.getenv("CHUNK_MODEL_NAME"))]
        elif extension in ["pdf"]:
            parser = ParserPDFImage()
            chunkers = [LLMBasedImageChunker(llm_model_type=os.getenv("CHUNK_MODEL_TYPE"), llm_model_name=os.getenv("CHUNK_MODEL_NAME"))]
        elif extension in ["jpeg", "jpg", "png"]:
            parser = ParserImage()
            chunkers = [LLMBasedImageChunker(llm_model_type=os.getenv("CHUNK_MODEL_TYPE"), llm_model_name=os.getenv("CHUNK_MODEL_NAME"))]
        else:
            raise HTTPException(status_code=400, detail=f"Invalid file extension (extension={extension}, proc_type={proc_type})")            
    elif proc_type == "plain":
        parser = ParserTXT()
        chunkers = [RuleBasedTextChunker(), LLMBasedTextChunker(llm_model_type=os.getenv("CHUNK_MODEL_TYPE"), llm_model_name=os.getenv("CHUNK_MODEL_NAME"))]
    else:
        raise HTTPException(status_code=400, detail=f"Invalid processing type (proc_type={proc_type})")

    print("parsing")
    file_content = await file.read()
    page_container = parser.parse(io.BytesIO(file_content))
    print("end parsing")

    print("start processing")
    await fn_process(page_container, chunkers, doc_id, db, collection)
    print("end processing")

    return {"message": "Request received successfully"}

def fn_vector_search(query_vector: List[float], collection: Collection) -> list[schemas.RetrieveDocument]:
    results = collection.search(
        data=query_vector, anns_field="vector", param={"metric_type": "IP", "params": {"nprobe": os.getenv("MILVUS_SEARCH_CLUSTERS")}}, limit=5,
        output_fields=["doc_id", "page_number", "chunk_content"],
    )[0]

    searched_chunks = []
    if len(results) > 0:
        static_threshold = float(os.getenv("STATIC_SCORE_THRESHOLD", 0.5))
        dynamic_threshold = (results.distances[0] * (1 - float(os.getenv("DYNAMIC_SCORE_THRESHOLD", 0.15)))) \
            if os.getenv("DYNAMIC_SCORE_THRESHOLD_STRATEGY", "pct") == "pct" \
            else (results.distances[0] - float(os.getenv("DYNAMIC_SCORE_THRESHOLD", 0.5)))
        print(f"fn_vector_search / top1_score: {round(results.distances[0], 5)}, static_threshold={round(static_threshold, 5)}, dynamic_threshold={round(dynamic_threshold, 5)}")
        
        for res in results:
            if (res.distance > dynamic_threshold) and (res.distance > static_threshold):
                searched_chunks.append(schemas.RetrieveDocument(
                    id=res.id,
                    doc_id=res.entity.get('doc_id'),
                    chunk_content=res.entity.get('chunk_content'),
                    page_number=res.entity.get('page_number'),
                    score=res.distance
                ))
                print(f"fn_vector_search / selected item -> (id: {res.id}, distance: {round(res.distance, 5)})")
            else:
                print(f"fn_vector_search / dropped item -> (id: {res.id}, distance: {round(res.distance, 5)})")

    return searched_chunks

def fn_retrieve_chunks(history_messages: list[schemas.ChatMessage], collection: Collection) -> list[list[schemas.RetrieveDocument]]:
    # reverse history messages
    retrieve_chunks = []
    history_messages = history_messages[::-1]
    current_message = history_messages[0]

    # process on current message
    query_vector = embedder.embed([current_message.user])
    searched_chunks = fn_vector_search(query_vector, collection)
    retrieve_chunks.append(searched_chunks)

    if len(history_messages) > 1:
        history_messages = history_messages[1:]
        # process on history messages
        for msg in history_messages:
            if isinstance(msg.chunk_ids, list):
                if len(msg.chunk_ids) == 0:
                    print(f"fn_retrieve_chunks / chunk_ids is empty / user_input={msg.user}")
                    retrieve_chunks.append([])
                else:
                    results = collection.query(
                        expr=f"id in {msg.chunk_ids}",
                        output_fields=["doc_id", "page_number", "chunk_content"],
                    )
                    if len(results) > 0:
                        scores = (np.array(query_vector) @ np.array(embedder.embed([res.get('chunk_content') for res in results])).T)[0]
                        msg_chunks = []
                        for res, score in zip(results, scores):
                            msg_chunks.append(
                                schemas.RetrieveDocument(
                                    id=res.get('id'),
                                    doc_id=res.get('doc_id'),
                                    chunk_content=res.get('chunk_content'),
                                    page_number=res.get('page_number'),
                                    score=score
                                )   
                            )
                        retrieve_chunks.append(msg_chunks)
                    else:
                        print(f"fn_retrieve_chunks / results is empty / user_input={msg.user}, chunk_ids={msg.chunk_ids}")
                        retrieve_chunks.append([])
            else:
                print(f"fn_retrieve_chunks / chunk_ids is None / user_input={msg.user}")
                retrieve_chunks.append([])

    return searched_chunks, retrieve_chunks[::-1]

def fn_rerank_chunks(retrieve_chunks: list[list[schemas.RetrieveDocument]]) -> list[schemas.RetrieveDocument]:
    multiplier = np.logspace(0, 1, len(retrieve_chunks))
    multiplier /= multiplier.max()
    score_container = {}
    for chunks, m in zip(retrieve_chunks, multiplier):
        for doc in chunks:
            if doc.id not in score_container:
                score_container[doc.id] = {"score": doc.score * m, "doc": doc}
            else:
                score_container[doc.id]["score"] = max(score_container[doc.id]["score"], doc.score * m)
    sorted_keys = sorted(score_container.keys(), key=lambda x: score_container[x]["score"], reverse=True)
    reranked_chunks = []
    for k in sorted_keys[:int(os.getenv("NUM_RETRIEVE_DOCS"))]:
        print(f"fn_rerank_chunks / final selected item -> (id={score_container[k]['doc'].id}, score={score_container[k]['score']})")
        reranked_chunks.append(score_container[k]["doc"])
    return reranked_chunks

@app.post("/api/document-manager/retrieval")
async def retrieval(
    form_data: schemas.RequestRetrieveDocument,
    collection: Collection = Depends(database.GetVectorDB)
):  
    # retrieve chunks
    searched_chunks, retrieved_chunks = fn_retrieve_chunks(form_data.messages, collection)
    # rerank chunks
    retrieved_chunks = fn_rerank_chunks(retrieved_chunks)
    return {"searched_docs": searched_chunks, "retrieved_docs": retrieved_chunks}