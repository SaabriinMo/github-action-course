import requests
import time
import os

def ping_url(url, delay, max_trials):

    trial = 0 
    while trial < max_trials:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True
        except requests.ConnectionError:
            print(f"Website {url} is unreachable. Retrying in {delay} seconds...")
            time.sleep(delay)
            trials += 1
        except requests.exceptions.MissingSchema:
            print(f"website {url}, is not a valid url")
            return False

    return False

def run():
    website_url = os.getenv("url")
    delay = int(os.getenv("delay"))
    max_trials = int(os.getenv("max-trials"))


    website_reachable = ping_url(website_url, delay, max_trials)

    if not website_reachable:
        raise Exception(f"Website: {website_url} is malfored or unreachable")
    print(f"website: {website_url} is reachable")



if __name__ == "__main__":
    run()