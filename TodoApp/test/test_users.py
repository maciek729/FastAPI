from TodoApp.test.utils import *
from ..routers.users import get_db, get_current_user
from fastapi import status

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

def test_return_user(test_user):
    response = client.get("/user")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == "mićka"
    assert response.json()["email"] == "mićka@gmail.com"
    assert response.json()["first_name"] == "mićka1"
    assert response.json()["last_name"] == "mićka2"
    assert response.json()["role"] == "admin"
    assert response.json()["phone_number"] == "(111)-111-1111"


def test_change_password_success(test_user):
    response = client.put("/user/password", json={"password": "12345",
                                                  "new_password": "654321"})
    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_change_password_invalid_current_password(test_user):
    response = client.put("/user/password", json={"password": "123456",
                                                  "new_password": "654321"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json() == {'detail': 'Error on password change'}


def test_change_phone_number_success(test_user):
    response = client.put("/user/phonenumber/222222222")
    assert response.status_code == status.HTTP_204_NO_CONTENT

