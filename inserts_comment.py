import pymysql
import random
from datetime import datetime, timedelta

# ----------------------------------------
# DB 연결 정보
# ----------------------------------------
conn = pymysql.connect(
    host="155.230.241.241",
    user="team3_nam",
    password="team3_nam##",
    db="univ_db_team3",
    charset="utf8"
)

cursor = conn.cursor()

# ----------------------------------------
# 랜덤 데이터 생성 함수
# ----------------------------------------

comments_list = [
    "좋은 상품이네요!", "상태가 좋아 보입니다.", "가격이 괜찮네요.",
    "구매하고 싶습니다.", "설명이 부족해요.", "배송은 어떻게 하나요?",
    "혹시 네고 가능한가요?", "사진이 더 있나요?", "빠른 답변 부탁드립니다!",
    "감사합니다 잘 볼게요!", "품질 좋아보이네요!", "관심 있습니다!"
]

def random_comment():
    return random.choice(comments_list)

def random_created_at():
    days_ago = random.randint(0, 500)
    rand_time = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
    return rand_time.strftime("%Y-%m-%d %H:%M:%S")

# ----------------------------------------
# INSERT SQL
# ----------------------------------------
sql = """
INSERT INTO comment (user_id, product_id, comment, created_at)
VALUES (%s, %s, %s, %s)
"""

TOTAL = 3000
batch_size = 500
data_batch = []

for i in range(TOTAL):

    user_id = random.randint(1, 90000)      # user 90,000명 범위
    product_id = random.randint(1, 3000)    # product 3,000개 범위
    comment_text = random_comment()
    created_at = random_created_at()

    data_batch.append((user_id, product_id, comment_text, created_at))

    if len(data_batch) == batch_size:
        cursor.executemany(sql, data_batch)
        conn.commit()
        print(f"{i+1} / {TOTAL} 댓글 삽입 완료")
        data_batch = []

# 남은 데이터 삽입
if data_batch:
    cursor.executemany(sql, data_batch)
    conn.commit()

print("\n🎉 comment 테이블에 3,000개의 댓글 데이터 생성 완료!")
cursor.close()
conn.close()
