from fastapi import APIRouter, HTTPException, Query
from .default_recipes import default_recipes

router = APIRouter(prefix="/default-recipes", tags=["Default Recipes"])


@router.get("/")
def get_default_recipes(
    search: str | None = Query(None),
    category: str | None = Query(None),
):
    results = default_recipes

    if search:
        s = search.lower()
        results = [
            r for r in results
            if s in r["title"].lower() or s in r["ingredients"].lower()
        ]

    if category:
        results = [r for r in results if r["category"].lower() == category.lower()]

    return results


@router.get("/{recipe_id}")
def get_default_recipe(recipe_id: int):
    recipe = next((r for r in default_recipes if r["id"] == recipe_id), None)
    if not recipe:
        raise HTTPException(status_code=404, detail="Không tìm thấy công thức")
    return recipe
