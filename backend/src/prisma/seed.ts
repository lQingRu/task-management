import { db } from './db';

async function main() {
  // Skills have a unique name, so we can safely upsert them.
  const frontend = await db.orm.public.Skill.upsert({
    create: {
      name: 'Frontend',
    },
    update: {},
    conflictOn: {
      name: 'Frontend',
    },
  });

  const backend = await db.orm.public.Skill.upsert({
    create: {
      name: 'Backend',
    },
    update: {},
    conflictOn: {
      name: 'Backend',
    },
  });

  const developers = [
    {
      name: 'Alice',
      skillIds: [frontend.id],
    },
    {
      name: 'Bob',
      skillIds: [backend.id],
    },
    {
      name: 'Carol',
      skillIds: [frontend.id, backend.id],
    },
    {
      name: 'Dave',
      skillIds: [backend.id],
    },
  ];

  for (const developer of developers) {
    const existing = await db.orm.public.Developer.first({
      name: developer.name,
    });

    if (existing) {
      continue;
    }

    const created = await db.orm.public.Developer.create({
      name: developer.name,
    });

    await db.orm.public.DeveloperSkill.createAll(
      developer.skillIds.map((skillId) => ({
        developerId: created.id,
        skillId,
      })),
    );
  }

  console.log('Database seeded successfully.');
}

main().catch((error) => {
  console.error('Failed to seed database:', error);
  process.exit(1);
});
