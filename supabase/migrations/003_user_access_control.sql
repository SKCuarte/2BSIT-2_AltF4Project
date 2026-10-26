DROP TABLE IF EXISTS user_permission CASCADE;
DROP TABLE IF EXISTS rights_catalogue CASCADE;
DROP TABLE IF EXISTS module CASCADE;
DROP TABLE IF EXISTS app_role CASCADE;
DROP TABLE IF EXISTS app_user CASCADE;

CREATE TABLE app_role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(10) DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive')),
    stamp VARCHAR(100)
);

CREATE TABLE app_user (
    user_id SERIAL PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role_id INTEGER REFERENCES app_role(role_id),
    isBlocked BOOLEAN DEFAULT FALSE,
    status VARCHAR(10) DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive')),
    stamp VARCHAR(100)
);

CREATE TABLE module (
    module_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(10) DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive')),
    stamp VARCHAR(100)
);

CREATE TABLE rights_catalogue (
    right_id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES module(module_id),
    right_name VARCHAR(100) NOT NULL,
    status VARCHAR(10) DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive')),
    stamp VARCHAR(100)
);

CREATE TABLE user_permission (
    user_id INTEGER REFERENCES app_user(user_id),
    right_id INTEGER REFERENCES rights_catalogue(right_id),
    status VARCHAR(10) DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive')),
    stamp VARCHAR(100),
    PRIMARY KEY (user_id, right_id)
);

CREATE INDEX idx_user_permission_user
ON user_permission(user_id);

CREATE INDEX idx_user_permission_right
ON user_permission(right_id);

INSERT INTO app_role(role_name, status)
VALUES
('Admin','Active'),
('Manager','Active'),
('Staff','Active');

INSERT INTO module(module_name, status)
VALUES
('User Management','Active'),
('Inventory','Active'),
('Sales','Active');

INSERT INTO rights_catalogue(module_id, right_name, status)
VALUES
(1,'Create User','Active'),
(1,'Edit User','Active'),
(1,'Delete User','Active'),
(2,'View Inventory','Active'),
(3,'Create Sales','Active');

INSERT INTO app_user
(firstName,lastName,email,passwordHash,role_id,isBlocked,status)
VALUES
('System','Admin','admin@hope.com','hashed_password',1,FALSE,'Active');

INSERT INTO user_permission(user_id,right_id,status)
VALUES
(1,1,'Active'),
(1,2,'Active'),
(1,3,'Active');
