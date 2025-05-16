from datetime import datetime

def utils_parse_date(date_str):
    try: 
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return datetime.min

def utils_add_timestamp(documents):
    for doc in documents:
        # Adding a timestamp
        if "timestamp" not in doc:
            doc["timestamp"] = datetime.now()
    return documents

def utils_sort_by_event_date(documents):
    return sorted(documents, key=lambda x: x.get('properties', datetime.min).get('start', datetime.min), reverse=True)