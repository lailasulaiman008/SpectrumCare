"""
SpectrumCare AI Model Training Script
Generates synthetic M-CHAT-R data, trains a LogisticRegression model,
and saves it as model.pkl for the prediction service.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import joblib
import os

# At-risk answer mapping for each question (True = yes is at-risk, False = no is at-risk)
AT_RISK_IS_YES = {
    0: False,   # Q1: Joint Attention
    1: True,    # Q2: Hearing Concern
    2: False,   # Q3: Pretend Play
    3: False,   # Q4: Climbing
    4: True,    # Q5: Unusual Finger Movements
    5: False,   # Q6: Pointing to Request
    6: False,   # Q7: Pointing to Share
    7: False,   # Q8: Peer Interest
    8: False,   # Q9: Showing Objects
    9: False,   # Q10: Response to Name
    10: False,  # Q11: Social Smile
    11: True,   # Q12: Sensory Sensitivity
    12: False,  # Q13: Walking
    13: False,  # Q14: Eye Contact
    14: False,  # Q15: Imitation
    15: False,  # Q16: Gaze Following
    16: False,  # Q17: Attention Seeking
    17: False,  # Q18: Comprehension
    18: False,  # Q19: Social Referencing
    19: False,  # Q20: Movement Activities
}

FEATURE_NAMES = [
    "Joint Attention", "Hearing Concern", "Pretend Play", "Climbing",
    "Unusual Finger Movements", "Pointing to Request", "Pointing to Share",
    "Peer Interest", "Showing Objects", "Response to Name", "Social Smile",
    "Sensory Sensitivity", "Walking", "Eye Contact", "Imitation",
    "Gaze Following", "Attention Seeking", "Comprehension",
    "Social Referencing", "Movement Activities", "Age (months)"
]

def compute_at_risk_score(answers):
    """Compute at-risk score from 20 binary answers."""
    score = 0
    for i in range(20):
        ans = answers[i]  # 1=yes, 0=no
        if AT_RISK_IS_YES[i]:
            if ans == 1:
                score += 1
        else:
            if ans == 0:
                score += 1
    return score

def score_to_label(score):
    """Convert at-risk score to risk label."""
    if score <= 2:
        return 0  # LOW
    elif score <= 7:
        return 1  # MEDIUM
    else:
        return 2  # HIGH

def generate_synthetic_data(n_samples=2000):
    """Generate synthetic training data using M-CHAT-R scoring logic."""
    np.random.seed(42)
    X = []
    y = []

    for _ in range(n_samples):
        # Generate random answers (biased toward typical development)
        risk_prob = np.random.choice([0.15, 0.35, 0.7], p=[0.5, 0.3, 0.2])
        answers = []
        for i in range(20):
            if AT_RISK_IS_YES[i]:
                # "yes" is at-risk
                answers.append(1 if np.random.random() < risk_prob else 0)
            else:
                # "no" is at-risk
                answers.append(0 if np.random.random() < risk_prob else 1)

        age_months = np.random.randint(16, 48)
        features = answers + [age_months]
        score = compute_at_risk_score(answers)
        label = score_to_label(score)

        X.append(features)
        y.append(label)

    return np.array(X, dtype=float), np.array(y)

def train_and_save():
    """Train model and save artifacts."""
    print("Generating 2000 synthetic training samples...")
    X, y = generate_synthetic_data(2000)

    print(f"Class distribution: LOW={np.sum(y==0)}, MEDIUM={np.sum(y==1)}, HIGH={np.sum(y==2)}")

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train logistic regression
    print("Training LogisticRegression model...")
    model = LogisticRegression(
        solver='lbfgs',
        max_iter=1000,
        random_state=42
    )
    model.fit(X_scaled, y)

    # Evaluate
    accuracy = model.score(X_scaled, y)
    print(f"Training accuracy: {accuracy:.3f}")

    # Save
    script_dir = os.path.dirname(os.path.abspath(__file__))
    joblib.dump(model, os.path.join(script_dir, 'model.pkl'))
    joblib.dump(scaler, os.path.join(script_dir, 'scaler.pkl'))
    joblib.dump(FEATURE_NAMES, os.path.join(script_dir, 'feature_names.pkl'))
    print("Model saved as model.pkl, scaler.pkl, feature_names.pkl")

if __name__ == '__main__':
    train_and_save()
