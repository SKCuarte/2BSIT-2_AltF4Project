import os

migration_dir = "supabase/migrations"

print("Running migrations...")

for file in sorted(os.listdir(migration_dir)):
    if file.endswith(".sql"):
        print(f"Applying {file}")

print("Done!")
