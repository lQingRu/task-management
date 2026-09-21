import { db } from "../../prisma/db.js";

export async function getSkills() {
  return db.orm.public.Skill.select("id", "name")
    .orderBy((skill) => skill.name.asc())
    .all();
}
