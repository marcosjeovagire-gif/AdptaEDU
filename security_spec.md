# Security Specification - AdaptaEdu Escolar

## Data Invariants
1. Students must belong to a school and have a valid name and class.
2. PEIs must be linked to a valid student ID.
3. Activities must be linked to a student and have a teacher/professor as creator.
4. Support records must be linked to a student and recorded by an authorized support professional.
5. Authorized users can only see students and records within their assigned roles and permissions.

## Dirty Dozen Payloads (Negative Tests)
1. **Unauthenticated Write**: Attempt to create a student without login.
2. **Identity Spoofing**: Professor A attempts to create an activity with `professorId` of Professor B.
3. **Role Escalation**: Teacher attempts to modify `authorizedUsers` to grant themselves `coordinator` role.
4. **Orphaned PEI**: Attempt to create a PEI for a non-existent student ID.
5. **PII Leak**: Non-authorized user attempts to list all students.
6. **Immutable Field Change**: Attempt to change `createdAt` on an activity.
7. **Invalid Status**: Attempt to set activity status to a non-existent value.
8. **Shadow Field**: Attempt to inject `isSystemAdmin: true` into a user profile.
9. **Large Payload**: Attempt to write a 2MB string into `laudo`.
10. **State Shortcut**: Attempt to set PEI status to `homologado` without required fields.
11. **Cross-School Access**: User from School A attempts to read students from School B.
12. **Deleted Access**: Attempt to read records of a student in `arquivado` situation by a non-coordinator.

## Firestore Rules Test (Draft)
```ts
import { 
  assertFails, 
  assertSucceeds, 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'gen-lang-client-0965320684',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
});

test('unauthenticated write fails', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'students/1'), { nome: 'João' }));
});
```
