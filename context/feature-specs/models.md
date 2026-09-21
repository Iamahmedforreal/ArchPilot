read `Architeture Content.md` for architecute and `code-standard.md` for standrads before writing anything
create file in model

it should create base class 
and make table called 

Add `Project`:

- owner ID mapped to Clerk user
- name
- optional description
- status enum: `DRAFT`, `ARCHIVED`
- `canvasJsonPath` for future canvas blob storage
- timestamps
- indexes on owner ID and creation date


## Migration

Run the migration and generate the client.

## Check When Done
- schema has both models with correct relations and indexes
- migration runs successfully
- `npm run build` passes
