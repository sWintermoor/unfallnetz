#use python
FROM python:3.11-slim

#working directory inside of the container
WORKDIR /unfallnetz

#copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

#copy all project
COPY . .

#start the project
CMD ["python", "main.py"]
