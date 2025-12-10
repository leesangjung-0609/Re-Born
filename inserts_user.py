import pymysql
import random
import string
from datetime import datetime, timedelta

# ---------------------------------------------------
# DB 연결 정보
# ---------------------------------------------------
conn = pymysql.connect(
    host="155.230.241.241",
    user="team3_nam",
    password="team3_nam##",
    db="univ_db_team3",
    charset="utf8"
)

cursor = conn.cursor()

# ---------------------------------------------------
# 랜덤 데이터 생성 함수들
# ---------------------------------------------------

first_names = ["김", "이", "박", "최", "정", "강", "조", "윤", "임", "한", "오", "서"]
last_names = ["민수", "서연", "지훈", "하늘", "도윤", "예진", "수현", "지아", "현우", "유진", "가온", "태현"]

def random_name():
    return random.choice(first_names) + random.choice(last_names)

def random_username():
    letters = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"user_{letters}"

def random_password():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=10))

def random_phone(i):
    return f"010-{(1000 + i % 9000):04d}-{(1000 + random.randint(0, 8999)):04d}"

def random_birth():
    start_date = datetime(1950, 1, 1)
    end_date = datetime(2015, 12, 31)
    days = (end_date - start_date).days
    random_day = start_date + timedelta(days=random.randint(0, days))
    return random_day.strftime("%Y-%m-%d")

def random_created_at():
    days_ago = random.randint(0, 1000)
    rand_date = datetime.now() - timedelta(days=days_ago)
    return rand_date.strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------------------------------
# 10,000개 INSERT 실행
# ---------------------------------------------------

TOTAL = 10000
batch_size = 1000

sql = """
INSERT INTO user (
    username, password, name, email, phone, status, age, birth, gender, created_at
) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
"""

data_batch = []

for i in range(TOTAL):

    username = random_username()
    password = random_password()
    name = random_name()
    email = username + "@gmail.com"
    phone = random_phone(i)
    status = random.choice(["active", "withdrawn"])
    age = random.randint(10, 70)
    birth = random_birth()
    gender = random.choice(["male", "female"])   # ★ 수정된 부분!
    created_at = random_created_at()

    data_batch.append((username, password, name, email, phone, status, age, birth, gender, created_at))

    if len(data_batch) == batch_size:
        cursor.executemany(sql, data_batch)
        conn.commit()
        print(f"{i+1} / {TOTAL} 데이터 삽입 완료")
        data_batch = []

if data_batch:
    cursor.executemany(sql, data_batch)
    conn.commit()

print("\n🎉 10,000명 user 데이터 생성 완료!")
cursor.close()
conn.close()
