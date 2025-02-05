# KYC (Know Your Customer) Verification System

This repository contains the codebase for a KYC (Know Your Customer) system designed to automate document and identity verification processes. The project integrates OCR (Optical Character Recognition) using Tesseract.js and face detection functionality via Face API. While functional, the system has some limitations and security vulnerabilities that need addressing.

---

## 🚀 Features

- **Document Verification**:  
  Utilizes Tesseract.js for OCR to extract text data from uploaded documents.  

- **Face Matching**:  
  Compares the user's uploaded photo with their ID document using Face API.  

- **User Management Pages**:  
  Includes a series of front-end pages for user interaction and KYC submission.  

---

## ⚠️ Current Limitations and Vulnerabilities

### OCR (Tesseract.js) for Document Validation  
- The current implementation captures text data but lacks advanced logic for data validation and accuracy.  
- It may not handle edge cases like varying document layouts, fonts, or degraded image quality effectively.  

### Security Vulnerabilities with Face API  
- **Vulnerability Threats**: There are **3 severe vulnerabilities** in the Face API integration that could expose sensitive user data or compromise system integrity.  
- **Immediate Attention Needed**: These issues need mitigation to ensure the security and privacy of user information.  

### Development in Progress  
- Additional pages and functionality are actively being added to improve usability and system capabilities.  

---

## 📸 Screenshots of the Pages

### 1. Home Page  
The landing page where users are introduced to the KYC system.  
![Home Page](./screenshots/Screenshot-2025-01-26-172801.png)

### 2. Document Upload Page  
The page where users upload their ID documents for OCR processing.  
![Document Upload Page](./screenshots/Screenshot-2025-01-26-173025.png)

### 3. Face Verification Page  
This page allows users to upload their photo for comparison with their ID document.  
![Face Verification Page](./screenshots/Screenshot-2025-01-26-173131.png)

---

## 🚧 Development Roadmap

- **Enhanced OCR Logic**:  
  Develop improved algorithms to handle document layout variability and ensure accurate data capture.  

- **Security Improvements**:  
  Address the existing vulnerabilities in the Face API integration to enhance user data protection.  

- **Feature Expansion**:  
  Add functionalities such as real-time error handling, robust backend integration, and user feedback mechanisms.  
