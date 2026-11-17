from fastapi import Request


def get_user_address(request: Request) -> str:
    return request.client.host
