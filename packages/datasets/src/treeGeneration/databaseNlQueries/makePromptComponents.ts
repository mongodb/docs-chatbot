import { DatabaseInfo, DatabaseUseCase, DatabaseUser } from "./nodeTypes";

export function makePromptDbInfo(databaseInfo: DatabaseInfo) {
  return `## Database Information

Name: ${databaseInfo.name}
Description: ${databaseInfo.description}

### Collections

${databaseInfo.schema
  .map(
    (c) => `#### Collection \`${c.name}\`
Description: ${c.description}
Schema:
${c.schema}`
  )
  .join("\n")}`;
}

export function makePromptDbUserInfo(user: DatabaseUser) {
  return `## User Information

Name: ${user.name}
Job Title: ${user.jobTitle}
Department: ${user.department}
Expertise: ${user.expertise.join(", ")}
Years of Experience: ${user.yearsOfExperience}`;
}

export function makePromptUseCaseInfo(useCase: DatabaseUseCase) {
  return `## Use Case

Use Case Title: ${useCase.title}
Use Case Description: ${useCase.description}
Complexity: ${useCase.complexity}
Frequency: ${useCase.frequency}
Data Needed: ${useCase.dataNeeded.join(", ")}`;
}
