import os
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import auth, schemas, database, prompts
from openai import OpenAI
from typing import List
import httpx
from dotenv import load_dotenv
load_dotenv()

# Create FastAPI App
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv('FRONTEND_URL')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create LLM API Client
if os.getenv("GEN_MODEL_TYPE") == "openai":
    llm_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    sampling_params = {
        "max_tokens": 512,
        "temperature": 0.5,
        "top_p": 0.95,
        "frequency_penalty": 0.5,
    }
else:
    llm_client = OpenAI(api_key=os.getenv("LLM_API_KEY"), base_url=os.getenv("LLM_MODEL_URL"))
    sampling_params = {
        "max_tokens": 512,
        "temperature": 0.5,
        "top_k": 50,
        "top_p": 0.95,
        "frequency_penalty": 0.5,
    }

@app.post("/api/auth/signup")
async def signup(
    form_data: schemas.RequestSignup,
    db: Session = Depends(database.GetRDB)
):
    # check if user already exists
    user = db.query(database.Users).filter(database.Users.username == form_data.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # create new user
    user = database.Users(
        username=form_data.username.strip(),
        hashed_password=auth.get_hashed_password(form_data.password.strip()),
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return {"message": "Registration successful"}

@app.post("/api/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.GetRDB)
):
    # check if user exists
    user = db.query(database.Users).filter(database.Users.username == form_data.username).first()
    if (not user) or not (auth.verify_password(form_data.password, user.hashed_password)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    # create access token
    access_token = auth.create_access_token({"username": user.username})
    return {"message": "Login successful", "access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
async def read_me(
    current_user: database.Users = Depends(auth.get_current_user)
):
    return {
        "message": "Authentication successful",
        **{col: getattr(current_user, col) for col in ["id", "username", "is_active", "created_at"]}
    }

async def api_retrieval(form_data: schemas.RequestQuery, num_history_msgs: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{os.getenv('DOCUMENT_MANAGER_URL')}/api/document-manager/retrieval",
                json={
                    "chat_id": form_data.chat_id,
                    "messages": 
                    [
                        {
                            "user": msg.user,
                            "assistant": msg.assistant,
                            "doc_ids": msg.doc_ids,
                            "chunk_ids": msg.chunk_ids,
                        } for msg in form_data.messages[-(num_history_msgs + 1):]
                    ]
                },
            )
            response.raise_for_status()
            response = response.json()
            output =  {
                "searched_docs": [schemas.RetrieveDocument(**doc) for doc in response["searched_docs"]],
                "retrieved_docs": [schemas.RetrieveDocument(**doc) for doc in response["retrieved_docs"]]
            }
            return output
    except Exception as e:
        print(f"Error in retrieval: {e}")
        return {"searched_docs": [], "retrieved_docs": []}

def fn_create_prompt(user_input: str, retrieve_docs: list[schemas.RetrieveDocument]) -> str:
    context = "\n".join([f"<content={i+1}>\n{doc.chunk_content}\n<content={i+1}>" for i, doc in enumerate(retrieve_docs)])
    question = user_input
    return prompts.RAG["user"].format(context=context, question=question)

@app.post("/api/ai-search/stream-chat")
async def stream_chat(
    form_data: schemas.RequestQuery,
):
    retrieval_result = await api_retrieval(form_data, int(os.getenv("NUM_HISTORY_MSGS")))

    async def stream_response(history_messages: List[schemas.ChatMessage], num_history_msgs: int, searched_docs: list[schemas.RetrieveDocument], retrieved_docs: list[schemas.RetrieveDocument]):
        # reverse history messages
        formatted_messages = []
        history_messages = history_messages[::-1]
        current_message = history_messages[0]
        formatted_messages.append({"role": "user", "content": fn_create_prompt(current_message.user, retrieved_docs)})
        # append history messages
        if len(history_messages) > 1:
            history_messages = history_messages[1:][:num_history_msgs]
            for msg in history_messages:
                formatted_messages.append({"role": "assistant", "content": msg.assistant if msg.assistant else ""})
                formatted_messages.append({"role": "user", "content": msg.user if msg.user else ""})
        history_messages = history_messages[::-1]

        completion = llm_client.chat.completions.create(
            model=os.getenv("GEN_MODEL_ID"),
            messages=formatted_messages,
            **sampling_params,
            stream=True,
        )
        for chunk in completion:
            data = chunk.choices[0].delta.content
            if data:
                yield data.encode('utf-8')
        
        # 검색된 문서가 없는 경우 빈 문자열 반환
        if not searched_docs:
            yield f"|doc_ids=</s>chunk_ids="
        else:
            doc_ids = ",".join(set([str(doc.doc_id) for doc in searched_docs]))
            chunk_ids = ",".join([str(doc.id) for doc in searched_docs])
            yield f"|doc_ids={doc_ids}</s>chunk_ids={chunk_ids}"
    try:
        return StreamingResponse(
            stream_response(form_data.messages, int(os.getenv("NUM_HISTORY_MSGS")), retrieval_result["searched_docs"], retrieval_result["retrieved_docs"]),
            media_type='text/event-stream'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-search/save-chat")
async def save_chat(
    form_data: schemas.RequestSaveChat, 
    current_user: database.Users = Depends(auth.get_current_user), 
    db: Session = Depends(database.GetRDB)
):
    try:
        new_chat = database.Chats(
            username=current_user.username,
            title=form_data.title
        )
        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)
        
        # 채팅 메시지들 저장
        if form_data.messages:
            chat_messages = [
                database.ChatMessages(
                    chat_id=new_chat.id,
                    user=message.user,
                    assistant=message.assistant,
                    doc_ids=message.doc_ids,
                    chunk_ids=message.chunk_ids,
                )
                for message in form_data.messages
            ]
            
            db.add_all(chat_messages)
            db.commit()

        return {
            "message": "Chat saved successfully",   
            "chat_id": new_chat.id,
            "created_at": new_chat.created_at,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai-search/load-chat")
async def load_chat(
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    # 사용자의 모든 채팅 조회
    chats = db.query(database.Chats).filter(
        database.Chats.username == current_user.username
    ).order_by(database.Chats.created_at.desc()).all()
    
    if not chats:
        return []
    
    # 채팅 ID 목록 추출
    chat_ids = [chat.id for chat in chats]
    
    # 모든 채팅의 메시지들 조회
    messages = db.query(database.ChatMessages).filter(
        database.ChatMessages.chat_id.in_(chat_ids)
    ).order_by(database.ChatMessages.created_at).all()
    
    # 채팅 ID별로 메시지 그룹화
    messages_by_chat = {}
    for msg in messages:
        if msg.chat_id not in messages_by_chat:
            messages_by_chat[msg.chat_id] = []
        messages_by_chat[msg.chat_id].append({
            "user": msg.user,
            "assistant": msg.assistant,
            "doc_ids": msg.doc_ids,
            "chunk_ids": msg.chunk_ids,
        })
    
    # 응답 데이터 구성
    return [{
        "chat_id": chat.id,
        "title": chat.title,
        "created_at": chat.created_at,
        "messages": messages_by_chat.get(chat.id, [])
    } for chat in chats]

@app.post("/api/ai-search/update-chat-title")
async def update_chat_title(
    form_data: schemas.RequestUpdateChat,
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    try:
        chat = db.query(database.Chats).filter(
            database.Chats.id == form_data.chat_id,
            database.Chats.username == current_user.username
        ).first()
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        chat.title = form_data.title
        db.commit()
        
        return {"message": "Chat title updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-search/delete-chat")
async def delete_chat(
    form_data: schemas.RequestDeleteChat,
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    try:
        # 채팅 메시지 먼저 삭제
        db.query(database.ChatMessages).filter(
            database.ChatMessages.chat_id == form_data.chat_id
        ).delete()

        # 채팅 삭제
        result = db.query(database.Chats).filter(
            database.Chats.id == form_data.chat_id,
            database.Chats.username == current_user.username
        ).delete()
        
        if not result:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        db.commit()
        return {"message": "Chat deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-search/save-message")
async def save_message(
    form_data: schemas.RequestSaveMessage,
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    try:
        # 채팅이 현재 사용자의 것인지 확인
        chat = db.query(database.Chats).filter(
            database.Chats.id == form_data.chat_id,
            database.Chats.username == current_user.username
        ).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        # 메시지 저장
        chat_message = database.ChatMessages(
            chat_id=form_data.chat_id,
            user=form_data.user,
            assistant=form_data.assistant,
            doc_ids=form_data.doc_ids,
            chunk_ids=form_data.chunk_ids,
        )
        db.add(chat_message)
        db.commit()
        return {"message": "Message saved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-search/delete-all-chats")
async def delete_all_chats(
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    try:
        # 사용자의 모든 채팅 ID 조회
        chat_ids = [chat.id for chat in db.query(database.Chats.id).filter(
            database.Chats.username == current_user.username
        ).all()]
        
        # 모든 채팅 메시지 삭제
        db.query(database.ChatMessages).filter(
            database.ChatMessages.chat_id.in_(chat_ids)
        ).delete(synchronize_session=False)
        
        # 모든 채팅 삭제
        db.query(database.Chats).filter(
            database.Chats.username == current_user.username
        ).delete()
        
        db.commit()
        return {"message": "All chats deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

async def api_process_document(file_content: bytes, filename: str, doc_id: int, extension: str, proc_type: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{os.getenv('DOCUMENT_MANAGER_URL')}/api/document-manager/process-document",
                files={'file': (filename, file_content, 'application/octet-stream')},
                data={'doc_id': doc_id, 'extension': extension, 'proc_type': proc_type},
                timeout=3600
            )
            response.raise_for_status()
    except Exception as e:
        pass

@app.post("/api/ai-search/upload-document")
async def upload_document(
    files: List[UploadFile] = File(...),
    proc_type: str = Form(...),
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB),
    background_tasks: BackgroundTasks = None,
):
    try:
        uploaded_docs = []
        
        for file in files:
            # DB 저장
            extension = os.path.splitext(file.filename)[1].lower()[1:]
            new_document = database.Documents(
                user_username=current_user.username,
                title=file.filename,
                extension=extension,
                proc_type=proc_type
            )
            db.add(new_document)
            db.commit()
            db.refresh(new_document)

            # 파일 내용 읽기
            file_content = await file.read()
            
            # 백그라운드 태스크 추가
            background_tasks.add_task(
                api_process_document,
                file_content,
                file.filename,
                new_document.id,
                extension,
                proc_type
            )

            uploaded_docs.append({
                "doc_id": new_document.id,
                "title": new_document.title,
                "extension": new_document.extension,
                "proc_type": new_document.proc_type
            })

        return {
            "message": f"{len(uploaded_docs)} documents upload started",
            "documents": uploaded_docs
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai-search/get-documents")
async def get_documents(
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    try:
        # 사용자의 모든 문서 조회
        documents = db.query(database.Documents).filter(
            database.Documents.user_username == current_user.username
        ).order_by(database.Documents.created_at.desc()).all()
        
        # 문서 타입별로 그룹화
        grouped_docs = {
            "text": [],
            "image": [],
            "plain": []
        }
        
        for doc in documents:
            grouped_docs[doc.proc_type].append({
                "id": doc.id,
                "title": doc.title,
                "extension": doc.extension,
                "created_at": doc.created_at,
                "progress": doc.progress
            })
            
        return grouped_docs

    except Exception as e:
        print(f"Error in get_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-search/delete-document/")
async def delete_document(
    form_data: schemas.RequestDeleteDocument,
    current_user: database.Users = Depends(auth.get_current_user),
    db: Session = Depends(database.GetRDB)
):
    try:
        result = db.query(database.Documents).filter(
            database.Documents.id == form_data.doc_id,
            database.Documents.user_username == current_user.username
        ).delete()
        
        if not result:
            raise HTTPException(status_code=404, detail="Document not found")
        
        db.commit()
        return {"message": "Document deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))