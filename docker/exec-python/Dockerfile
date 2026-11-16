FROM python:3.12-alpine

RUN adduser -D -u 1000 runner
COPY entrypoint.py /entrypoint.py

USER runner
WORKDIR /work

ENTRYPOINT ["python3", "/entrypoint.py"]
