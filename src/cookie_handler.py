COUNTER = 0

def create_cookie():
    global COUNTER
    COUNTER = COUNTER + 1
    return f"Hallo{COUNTER}"
