import os
import requests
from dotenv import load_dotenv
load_dotenv()

def main():
    try:
        # 회원가입 API 호출
        response = requests.post(
            'http://localhost:8000/api/auth/signup',
            json={
                'username': os.getenv("ADMIN_USERNAME"),
                'password': os.getenv("ADMIN_PASSWORD")
            }
        )
        
        if response.status_code == 400:
            print("Admin account already exists")
        elif response.status_code == 200:
            print("Admin account created successfully")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error creating admin account: {str(e)}")

if __name__ == "__main__":
    main()
