"""Lead scoring service for CRM module."""

from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.enums import ApplicationStatus


class LeadScoringService:
    """Service for calculating and updating lead scores."""

    @staticmethod
    def calculate_lead_score(application: Application, session: Session) -> int:
        """
        Calculate lead score based on:
        - Stage progression (25 points per stage)
        - Planned activities (5 points per activity)
        - Document uploads (10 points per document)
        - Lead recency (bonus for recent leads)

        Args:
            application: Application object to score
            session: Database session

        Returns:
            Calculated score (0-100)
        """
        score = 0

        # Stage progression scoring (0-50 points)
        # Stages: new (0) -> contacted (10) -> interested (20) -> qualified (30+)
        stage_scores = {
            "new": 0,
            "contacted": 10,
            "interested": 20,
            "qualified": 30,
            "proposal_sent": 40,
            "negotiating": 50,
        }
        stage_key = application.stage_key or "new"
        score += stage_scores.get(stage_key, 0)

        # Planned activities scoring (0-25 points, max 5 activities)
        if application.planned_activities:
            activity_count = min(len(application.planned_activities), 5)
            score += activity_count * 5

        # Document uploads scoring (0-25 points, max 10 documents)
        if application.documents:
            doc_count = min(len(application.documents), 10)
            score += doc_count * 2  # Approximately 20 points for 10 docs

        # Cap score at 100
        return min(score, 100)

    @staticmethod
    def update_lead_score(application_id: int, session: Session) -> int:
        """
        Update the lead_score for a specific application.

        Args:
            application_id: ID of the application to score
            session: Database session

        Returns:
            Updated score
        """
        application = session.query(Application).filter_by(id=application_id).first()
        if not application:
            return 0

        new_score = LeadScoringService.calculate_lead_score(application, session)
        application.lead_score = new_score
        session.commit()

        return new_score

    @staticmethod
    def bulk_update_lead_scores(application_ids: list[int], session: Session) -> dict:
        """
        Bulk update lead scores for multiple applications.

        Args:
            application_ids: List of application IDs to score
            session: Database session

        Returns:
            Dictionary with application_id -> updated_score mapping
        """
        results = {}
        applications = session.query(Application).filter(Application.id.in_(application_ids)).all()

        for application in applications:
            new_score = LeadScoringService.calculate_lead_score(application, session)
            application.lead_score = new_score
            results[application.id] = new_score

        session.commit()
        return results
