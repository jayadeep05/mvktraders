import requests
import json

url = "https://deepcodev.com/api/auth/login"
payload = {
    "email": "SM0001",
    "password": "mSRINIVAS777!!"
}
headers = {
    "Content-Type": "application/json"
}

try:
    print(f"Sending POST to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
