# Suggested Improvements

## Backend 

### Architecture

#### Introduce a Domain Layer
Leads as Domain Layer. It would contain the business logic for the leads.

Everything related to HTTP would go into the API Layer, it would validate external inputs and delegate to the Domain Layer.
It would also map the result to the appropiate HTTP response, including HTTP status codes.

### Performance

- Bulk insert: Utilise bulk operations to reduce round-trips overhead and save up connections. E.g: createMany instead of create. Quick and cheap win, good cost/value ratio.
- Add cache in front of API calls (I assume verifyEmail is mocking an API). Might be overkill at this state tho.

### Misc

- Rename myQueue to somehting more intent-revealing
- Pass things like the Temporal URL through env variables instead of hardcoding.

## Frontend

- Create some reusable components to make sure UX stays consistent. E.g: Spinner.
- Upgrade to tailwind v4 with themes.
- Use semantic tokens with Tailwind to ensure consistency on the UI. This means not using hardcoded colors on the jsx like blue or #4444.
- Use OKLCH instead of HEX.
- Add some nice micro-animations for interactions, have some ideas :)

## Misc

- Improve sharing logic between Frontend and Backend. Possible solution: shared Types packages and common code like validations between frontend and backend.
- Add automated E2E tests.

## Feature and UX Improvement Suggestions

- Search & Filter Leads.
- Improve UX around the Enriching workflow. So the user can know preciselly what is happening, especially on slow operations. And not be blocked but current-operations when they don´t have to.
- Handle Rate-Limiting for phone enrichment.
