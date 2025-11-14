from fastapi import APIRouter

from .academic_level import router as academic_level_router
from .academic_load_file import router as academic_load_file_router
from .annual_holiday import router as annual_holiday_router
from .billing_report import router as billing_report_router
from .catalog_coordination import router as catalog_coordination_router
from .catalog_professor import router as catalog_professor_router
from .catalog_schedule_time import router as catalog_schedule_time_router
from .catalog_subject import router as catalog_subject_router
from .dashboard import router as dashboard_router
from .faculties import router as faculties_router
from .fixed_holiday_rule import router as fixed_holiday_rule_router
from .holiday import router as holiday_router
from .hourly_rate_history import router as hourly_rate_history_router
from .login import router as login_router
from .logout import router as logout_router
from .recycle_bin import router as recycle_bin_router
from .schools import router as schools_router
from .server_time import router as server_time_router
from .system_update import router as system_update_router
from .tasks import router as tasks_router
from .template_generation import router as template_generation_router
from .term import router as term_router
from .users import router as users_router
from .workdays_calculator import router as workdays_calculator_router

router = APIRouter(prefix="/v1")
router.include_router(login_router)
router.include_router(logout_router)
router.include_router(users_router)
router.include_router(tasks_router)
router.include_router(faculties_router)
router.include_router(schools_router)
router.include_router(academic_level_router, prefix="/academic-levels", tags=["academic-levels"])
router.include_router(academic_load_file_router, prefix="/academic-load-files", tags=["academic-load-files"])
router.include_router(billing_report_router, prefix="/billing-reports", tags=["billing-reports"])
router.include_router(hourly_rate_history_router, prefix="/hourly-rates", tags=["hourly-rates"])
router.include_router(fixed_holiday_rule_router, prefix="/fixed-holiday-rules", tags=["fixed-holiday-rules"])
router.include_router(holiday_router, prefix="/holidays", tags=["holidays"])
router.include_router(annual_holiday_router, prefix="/annual-holidays", tags=["annual-holidays"])
router.include_router(term_router, prefix="/terms", tags=["terms"])
router.include_router(workdays_calculator_router, prefix="/workdays-calculator", tags=["workdays-calculator"])
router.include_router(server_time_router, prefix="/server-time", tags=["server-time"])
router.include_router(catalog_schedule_time_router)
router.include_router(catalog_subject_router)
router.include_router(catalog_professor_router)
router.include_router(catalog_coordination_router)
router.include_router(recycle_bin_router)
router.include_router(template_generation_router, prefix="/template-generation", tags=["template-generation"])
router.include_router(dashboard_router, tags=["dashboards"])
router.include_router(system_update_router)
