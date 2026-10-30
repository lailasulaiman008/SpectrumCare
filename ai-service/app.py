"""
SpectrumCare AI Prediction Service
Flask server that accepts M-CHAT-R answers and returns risk predictions with SHAP explanations.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib
import shap
import os

app = Flask(__name__)
CORS(app)

# Load model artifacts
script_dir = os.path.dirname(os.path.abspath(__file__))
model = joblib.load(os.path.join(script_dir, 'model.pkl'))
scaler = joblib.load(os.path.join(script_dir, 'scaler.pkl'))
feature_names = joblib.load(os.path.join(script_dir, 'feature_names.pkl'))

# Create SHAP explainer
explainer = shap.LinearExplainer(model, masker=shap.maskers.Independent(
    data=np.zeros((1, 21))  # 20 answers + age
))

RISK_LABELS = ['LOW', 'MEDIUM', 'HIGH']

QUESTION_LABELS = {
    0: "Joint Attention", 1: "Hearing Concern", 2: "Pretend Play",
    3: "Climbing", 4: "Unusual Finger Movements", 5: "Pointing to Request",
    6: "Pointing to Share", 7: "Peer Interest", 8: "Showing Objects",
    9: "Response to Name", 10: "Social Smile", 11: "Sensory Sensitivity",
    12: "Walking", 13: "Eye Contact", 14: "Imitation",
    15: "Gaze Following", 16: "Attention Seeking", 17: "Comprehension",
    18: "Social Referencing", 19: "Movement Activities"
}

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        answers = data.get('answers', [])
        age_months = data.get('ageMonths', 24)

        if len(answers) != 20:
            return jsonify({'error': 'Expected 20 answers'}), 400

        # Build feature vector
        features = np.array(answers + [age_months], dtype=float).reshape(1, -1)
        features_scaled = scaler.transform(features)

        # Predict
        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]

        risk_level = RISK_LABELS[prediction]
        probability = float(probabilities[prediction])
        risk_score = int(probabilities[1] * 30 + probabilities[2] * 70)  # Weighted risk score 0-100

        # SHAP values
        shap_values = explainer.shap_values(features_scaled)

        # For the predicted class, get SHAP values
        if isinstance(shap_values, list):
            sv = shap_values[prediction][0]
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            # Shape is (n_samples, n_features, n_classes)
            sv = shap_values[0, :, prediction]
        else:
            sv = shap_values[0]

        shap_result = []
        for i in range(20):  # Only question features, not age
            val = float(sv[i])
            shap_result.append({
                'feature': f'q{i+1}',
                'label': QUESTION_LABELS.get(i, f'Q{i+1}'),
                'value': round(val, 4),
                'direction': 'risk' if val > 0 else 'protective'
            })

        # Sort by absolute value
        shap_result.sort(key=lambda x: abs(x['value']), reverse=True)

        return jsonify({
            'riskLevel': risk_level,
            'probability': round(probability, 4),
            'riskScore': risk_score,
            'shapValues': shap_result,
            'classProbabilities': {
                'LOW': round(float(probabilities[0]), 4),
                'MEDIUM': round(float(probabilities[1]), 4),
                'HIGH': round(float(probabilities[2]), 4),
            }
        })

    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'LogisticRegression', 'features': 21})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"\n[AI] SpectrumCare AI Service starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)

