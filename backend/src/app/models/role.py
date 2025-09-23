import enum as py_enum


class UserRoleEnum(str, py_enum.Enum):
    ADMIN = "admin"
    DIRECTOR = "director"
    DECANO = "decano"
    VICERRECTOR = "vicerrector"
    UNAUTHORIZED = "unauthorized"
