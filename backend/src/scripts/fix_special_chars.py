"""Script para corregir códigos con caracteres especiales."""

import asyncio

from app.core.db.database import local_session
from app.models.catalog_professor import CatalogProfessor
from sqlalchemy import update


async def fix_special_chars():
    """Corregir códigos de profesores con caracteres especiales."""
    async with local_session() as session:
        # Mapeo de correcciones
        corrections = {
            6: ("ÁG006", "AG006"),  # Álvaro
            16: ("ÁR016", "AR016"),  # Ángel
            164: ("ÓG164", "OG164"),  # Óscar Aguirre
            165: ("ÓL165", "OL165"),  # Óscar Escobar
            166: ("ÓA166", "OA166"),  # Óscar Rivera
            167: ("ÓG167", "OG167"),  # Óscar Montoya
            168: ("ÓA168", "OA168"),  # Óscar Molina
            169: ("ÓC169", "OC169"),  # Óscar Álvarez
        }

        for professor_id, (old_code, new_code) in corrections.items():
            stmt = update(CatalogProfessor).where(CatalogProfessor.id == professor_id).values(professor_id=new_code)

            await session.execute(stmt)
            print(f"✅ Updated ID={professor_id}: {old_code} → {new_code}")

        await session.commit()
        print(f"\n🎉 Total: {len(corrections)} professors updated successfully!")


if __name__ == "__main__":
    asyncio.run(fix_special_chars())
