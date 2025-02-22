# RAG 기반 LLM 챗봇 서비스

## 소개
이 프로젝트는 RAG (Retrieval-Augmented Generation) 아키텍처를 기반으로 한 LLM (Large Language Model) 챗봇 서비스입니다.
사용자가 입력한 질문에 대해 검색을 수행한 후, 검색된 정보를 활용하여 보다 정확하고 맥락에 맞는 답변을 생성합니다.

## 기술 스택
- **프론트엔드**: [Cursor AI IDE](https://cursor.sh) 활용
- **백엔드**: FastAPI 기반 직접 개발
- **RAG 아키텍처 및 LLM**: 자체 개발된 시스템 적용

## 설치 및 실행 방법
### 1. 환경 설정
```bash
python -m venv venv
source venv/bin/activate  # Windows의 경우 `venv\Scripts\activate`
pip install -r requirements.txt
```

### 2. 서버 실행
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. 프론트엔드 실행
Cursor AI IDE에서 프로젝트를 열고 실행하세요.

## 데모 영상
서비스 데모 영상은 아래 링크에서 확인할 수 있습니다.
[![데모 영상](https://img.youtube.com/vi/JpatfOEf1No/0.jpg)](https://youtu.be/JpatfOEf1No)
