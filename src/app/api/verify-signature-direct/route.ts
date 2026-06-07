import { NextRequest, NextResponse } from 'next/server';

interface VerificationResult {
  is_authentic: boolean;
  confidence: number;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Signature file is required' },
        { status: 400 }
      );
    }

    // Call the ML service directly using FormData (same approach as page.tsx)
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    
    console.log('🔍 Verifying signature directly with ML service...');
    
    const mlFormData = new FormData();
    mlFormData.append('file', file);

    const mlResponse = await fetch(`${mlServiceUrl}/verify-signature`, {
      method: 'POST',
      body: mlFormData,
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

    const result: VerificationResult = {
      is_authentic: mlResult.is_authentic || false,
      confidence: mlResult.confidence || 0,
      message: mlResult.is_authentic 
        ? `Signature verified as authentic (${Math.round(mlResult.confidence * 100)}% confidence)`
        : `Signature appears to be forged (${Math.round(mlResult.confidence * 100)}% confidence). Please try again.`
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Direct signature verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
