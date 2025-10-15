from fastapi import APIRouter

from .catalog_course import router as catalog_course_router
from .catalog_schedule_time import router as catalog_schedule_time_router
from .faculties import router as faculties_router
from .login import router as login_router
from .logout import router as logout_router
from .recycle_bin import router as recycle_bin_router
from .schools import router as schools_router
from .tasks import router as tasks_router
from .users import router as users_router

router = APIRouter(prefix="/v1")
router.include_router(login_router)
router.include_router(logout_router)
router.include_router(users_router)
router.include_router(tasks_router)
router.include_router(faculties_router)
router.include_router(schools_router)
router.include_router(catalog_schedule_time_router)
router.include_router(catalog_course_router)
router.include_router(recycle_bin_router)
