# Seeds

Add repeatable PostgreSQL seed scripts here as `NNN_description.sql`. The seed runner executes every file in lexical order in its own transaction on every run. Make each seed idempotent with stable keys and `INSERT ... ON CONFLICT ...` handling. Do not put credentials, plaintext passwords, or real personal data here.