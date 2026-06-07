import { NextRequest, NextResponse } from 'next/server';

interface VerifySingleSignatureRequest {
  signature: string; // base64 encoded signature
}

interface VerificationResult {
  is_authentic: boolean;
  confidence: number;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: VerifySingleSignatureRequest = await req.json();
    
    if (!body.signature) {
      return NextResponse.json(
        { error: 'Signature data is required' },
        { status: 400 }
      );
    }

    // Call the ML service for single signature verification using the working endpoint
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    
    console.log('🔍 Verifying single signature with ML service...');
    
    const mlResponse = await fetch(`${mlServiceUrl}/verify-student-signatures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signatures: [body.signature],
        user_id: 'single-verification',
        signature_type: 'student'
      }),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text();
      console.error('ML service error:', errorText);
      return NextResponse.json(
        { error: 'Signature verification failed', details: errorText },
        { status: 500 }
      );
    }

    const mlResult = await mlResponse.json();
    console.log('✅ ML verification result:', mlResult);

    // Extract the first (and only) result from the array
    const signatureResult = mlResult.results[0];
    
    const result: VerificationResult = {
      is_authentic: signatureResult.is_authentic || false,
      confidence: signatureResult.confidence || 0,
      message: signatureResult.is_authentic 
        ? `Signature verified as authentic (${Math.round(signatureResult.confidence * 100)}% confidence)`
        : `Signature appears to be forged (${Math.round(signatureResult.confidence * 100)}% confidence). Please try again.`
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Single signature verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
