import os
import getpass
from dotenv import load_dotenv

from pymongo import MongoClient
from pymongo.server_api import ServerApi
from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai.chat_models import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain

load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")

client = MongoClient(os.getenv("MONGO_URI"), server_api=ServerApi('1'))
db = client["Unfall"]

def load_docs():
    data = db["verkehrsmeldungen"]
    docs = []

    for entry in data:
        content = entry
        metadata = {"type": "Verkehrsmeldung"}

        docs.append(Document(page_content=content, metadata=metadata))

    return docs

def test_docs():
    docs = []
    content = "Just testing"
    metadata = {"type": "test"}

    docs.append(Document(page_content=content, metadata=metadata))
    return docs

def build_vectorstore():
    docs = test_docs()
    embeddings = OpenAIEmbeddings()
    return FAISS.from_documents(docs, embeddings)

def get_qa_chain():
    vs = build_vectorstore()
    llm = ChatOpenAI(model="gpt-4.1")

    system_prompt = (
        "Use the given context to answer the question. "
        "If you don't know the answer, say you don't know. "
        "Use three sentence maximum and keep the answer concise. "
        "Use German language."
        "Context: {context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])

    retriever = vs.as_retriever()
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    chain = create_retrieval_chain(retriever, question_answer_chain)
    return chain

def run_prompt_chatbot(input_text):
    chain = get_qa_chain()
    result = chain.invoke({"input": input_text})

    return result




