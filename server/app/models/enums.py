import enum


class UserRole(enum.StrEnum):
    SALES_EXECUTIVE = "SALES_EXECUTIVE"
    FINANCE_OFFICER = "FINANCE_OFFICER"
    DELIVERY_TEAM = "DELIVERY_TEAM"
    ADMIN = "ADMIN"


class ApplicationStatus(enum.StrEnum):
    LEAD = "LEAD"
    APPLICATION = "APPLICATION"
    VERIFICATION = "VERIFICATION"
    FINANCE = "FINANCE"
    QUERY = "QUERY"
    SANCTIONED = "SANCTIONED"
    DELIVERY = "DELIVERY"
    DISBURSEMENT = "DISBURSEMENT"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class DocStatus(enum.StrEnum):
    UPLOADED = "UPLOADED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class VerificationStatus(enum.StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class FinanceStatus(enum.StrEnum):
    PROCESSING = "PROCESSING"
    QUERY = "QUERY"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DeliveryStatus(enum.StrEnum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"


class DisbursementStatus(enum.StrEnum):
    PENDING_UTR = "PENDING_UTR"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
