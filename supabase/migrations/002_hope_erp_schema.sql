DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS department CASCADE;
DROP TABLE IF EXISTS job CASCADE;
DROP TABLE IF EXISTS jobHistory CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS salesDetail CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS payment CASCADE;
DROP TABLE IF EXISTS priceHist CASCADE;

CREATE TABLE employee (
    empno VARCHAR(5) NOT NULL PRIMARY KEY,
    lastname VARCHAR(15),
    firstname VARCHAR(15)
);

CREATE TABLE department (
    deptCode VARCHAR(3) NOT NULL,
    deptName VARCHAR(20),
    PRIMARY KEY (deptCode)
);

INSERT INTO department VALUES
('ACT','Accounting'),
('BR1','Sales Branch 1');

CREATE TABLE job (
    jobCode VARCHAR(4) NOT NULL PRIMARY KEY,
    jobDesc VARCHAR(20)
);

INSERT INTO job VALUES
('PRES','President'),
('VP','Vice president');

CREATE TABLE jobHistory (
    empNo VARCHAR(5) NOT NULL REFERENCES employee(empno),
    jobCode VARCHAR(4) NOT NULL REFERENCES job(jobCode),
    effDate DATE NOT NULL,
    salary DECIMAL(10,2) CHECK (salary >= 0.0),
    deptCode VARCHAR(4),
    PRIMARY KEY (empNo, jobCode, effDate),
    FOREIGN KEY (deptCode) REFERENCES department(deptCode)
);

CREATE TABLE customer (
    custno VARCHAR(5) NOT NULL PRIMARY KEY,
    custname VARCHAR(20),
    address VARCHAR(50),
    payterm VARCHAR(3) CHECK (payterm IN ('COD','30D','45D'))
);

INSERT INTO customer VALUES
('C0001','Globus Medical, Inc','2560 Gen Armistead Ave Audubon CA 94031','30D'),
('C0002','RF Industries, Inc','7610 Miramar Rd San Diego, CA 92602','45D'),
('C0003','Trisha Macdowell','7642 Clairemont Mesa Blvd San Diego CA 90321','COD');

CREATE TABLE product (
    prodCode VARCHAR(6) NOT NULL PRIMARY KEY,
    description VARCHAR(30),
    unit VARCHAR(3) CHECK (unit IN ('pc','ea','mtr','pkg','ltr'))
);

INSERT INTO product VALUES
('AD0001','Toshiba Canvio 1 TB','ea'),
('AK0001','HP Pavilion DV6000','pc'),
('AM0001','MS Wireless Mouse','pc');

CREATE TABLE sales (
    transNo VARCHAR(8) NOT NULL PRIMARY KEY,
    salesDate DATE,
    custNo VARCHAR(5),
    empNo VARCHAR(5),
    FOREIGN KEY (custNo) REFERENCES customer(custno),
    FOREIGN KEY (empNo) REFERENCES employee(empno)
);

CREATE TABLE salesDetail (
    transNo VARCHAR(8) NOT NULL REFERENCES sales(transNo),
    prodCode VARCHAR(6) NOT NULL REFERENCES product(prodCode),
    quantity DECIMAL(10,2) CHECK (quantity >= 0.0),
    PRIMARY KEY (transNo, prodCode)
);

CREATE TABLE payment (
    orNo VARCHAR(8) NOT NULL PRIMARY KEY,
    payDate DATE,
    amount DECIMAL(10,2),
    transNo VARCHAR(8) REFERENCES sales(transNo)
);

CREATE TABLE priceHist (
    effDate DATE NOT NULL,
    prodCode VARCHAR(6) NOT NULL REFERENCES product(prodCode),
    unitPrice DECIMAL(10,2) CHECK (unitPrice > 0),
    PRIMARY KEY (effDate, prodCode)
);
