import os
import re
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

client = MongoClient(os.getenv("MONGODB_URI_ENV"), server_api=ServerApi('1'))
db = client["Unfall"]

def load_docs():
    data = db["verkehrsmeldungen"].find({})
    docs = []

    for entry in data:
        if not entry['properties'].get('end'):
            entry['properties']['end'] = 'Unknown'

        if not entry['geometry'].get('coordinates'):
            entry['geometry']['coordinates'] = 'Unknown'

        content = entry['properties']['description']
        metadata = {"type": entry['properties']['art'],
                    "status": entry['properties']['status'],
                    "location": entry['geometry']['coordinates'],
                    "beginn": entry['properties']['start'],
                    "end": entry['properties']['end']}

        docs.append(Document(page_content=content, metadata=metadata))

    print(f"Länge des Dokuments: {len(docs)}")

    return docs

def build_vectorstore():
    docs = load_docs()
    embeddings = OpenAIEmbeddings()
    return FAISS.from_documents(docs, embeddings)

def get_qa_chain():
    vs = build_vectorstore()
    llm = ChatOpenAI(model="gpt-4.1")

    system_prompt = (
        "Use the given context to answer the question. "
        "If you don't know the answer, say you don't know. "
        "Give coordinates if you think they are usefull for localisation. Write them at end as COORDINATES: coordinate1, coordinate2 with four decimal places"
        # "Use three sentence maximum and keep the answer concise. "
        "Keep the answer concise. "
        "Use German language. "
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

def parse_response(input):
    answer = input['answer']
    pattern = r'COORDINATES:\s*([+-]?\d+\.\d{4})\s*,?\s*([+-]?\d+\.\d{4})'
    match = re.search(pattern, answer)
    if match:
        coordinate1, coordinate2 = match.groups()
        print(f"coord1: {coordinate1}, coord2: {coordinate2}")
        commands = {
            "coordinate1": coordinate1,
            "coordinate2": coordinate2
        }
        result = re.sub(pattern, '', answer).strip()
        return result, commands
    return input, None

def run_prompt_chatbot(input_text):
    chain = get_qa_chain()
    result = chain.invoke({"input": input_text})
    result, commands = parse_response(result)

    return result, commands




