import { NextRequest, NextResponse } from 'next/server';

// Flare Network Configuration
const FLARE_CONFIG = {
  chainId: 114, // Coston2 testnet
  rpcUrl: 'https://coston2-api.flare.network/ext/C/rpc',
  explorerUrl: 'https://coston2-explorer.flare.network',
  fdcHub: '0x3e52461Be1e4feFbF1CB98C0189f14cb96608C56',
  fdcVerification: '0x07f96C4Eb1Ff75e0e626169A9D7C278d46655Bc3',
  contractAddress: process.env.FLARE_CONTRACT_ADDRESS || '0x...', // Your deployed contract address
};

// In a real implementation, this would be a database
const flareVerifications = new Map();

// Helper functions
const validateWalletAddress = (address: string): boolean => {
  // Ethereum/Flare format
  const ethereumPattern = /^0x[a-fA-F0-9]{40}$/;
  // Flow formats (with and without 0x prefix)
  const flowPattern = /^[a-fA-F0-9]{8}$|^[a-fA-F0-9]{16}$|^0x[a-fA-F0-9]{8}$|^0x[a-fA-F0-9]{16}$/;
  
  return ethereumPattern.test(address) || flowPattern.test(address);
};

const detectBlockchainType = (address: string): 'ethereum' | 'flow' | 'unknown' => {
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return 'ethereum'; // Ethereum/Flare style
  } else if (/^[a-fA-F0-9]{8}$|^[a-fA-F0-9]{16}$|^0x[a-fA-F0-9]{8}$|^0x[a-fA-F0-9]{16}$/.test(address)) {
    return 'flow';
  }
  return 'unknown';
};

const normalizeFlowAddress = (address: string): string => {
  // Remove 0x prefix if present and ensure lowercase
  return address.toLowerCase().replace('0x', '');
};

const validateTwitterHandle = (handle: string): boolean => {
  const cleanHandle = handle.replace('@', '');
  const pattern = /^[a-zA-Z0-9_]{1,15}$/;
  return pattern.test(cleanHandle);
};

const normalizeWalletAddress = (address: string): string => {
  const blockchainType = detectBlockchainType(address);
  
  if (blockchainType === 'flow') {
    return normalizeFlowAddress(address);
  } else {
    return address.toLowerCase();
  }
};

const normalizeTwitterHandle = (handle: string): string => {
  return handle.replace('@', '').toLowerCase();
};

const extractTweetId = (input: string): string | null => {
  // Handle direct tweet IDs
  if (/^\d+$/.test(input)) {
    return input;
  }
  
  // Extract from URLs (both twitter.com and x.com)
  const urlPattern = /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/;
  const match = input.match(urlPattern);
  return match ? match[1] : null;
};

// Mock FDC response generator
const generateMockFDCResponse = (tweetId: string, twitterUserId: string, walletAddress: string) => {
  return {
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    attestationType: 'Web2Json',
    sourceId: 'twitter',
    messageIntegrityCode: `0x${Math.random().toString(16).slice(2, 18)}`,
    requestBody: {
      tweetId,
      expectedTwitterUserId: twitterUserId,
      walletAddress,
    },
    responseBody: {
      tweet: {
        id: tweetId,
        text: `Verifying my wallet ${walletAddress} on Flare Network #FlareNetwork #Web3Verification #AIETF`,
        user: {
          id: twitterUserId,
          screen_name: 'user_handle',
          name: 'User Name',
        },
        created_at: new Date().toISOString(),
      },
      verification_status: 'verified',
      wallet_mentioned: true,
      hashtags_present: ['FlareNetwork', 'Web3Verification', 'AIETF'],
    },
    proof: {
      merkleProof: `0x${Math.random().toString(16).repeat(16).slice(0, 64)}`,
      attestationData: `0x${Math.random().toString(16).repeat(32).slice(0, 128)}`,
    }
  };
};

// Mock transaction hash generator
const generateMockTxHash = (): string => {
  return `0x${Math.random().toString(16).repeat(4).slice(0, 64)}`;
};

// Cross-chain bridge simulation for gas payments
const simulateCrosschainBridge = (flowAddress: string, flareGasAmount: string) => {
  return {
    bridgeId: `bridge_${Date.now()}`,
    sourceChain: 'flow',
    destinationChain: 'flare-coston2',
    sourceAddress: flowAddress,
    gasAmount: flareGasAmount,
    bridgeStatus: 'completed',
    bridgeTxHash: `0x${Math.random().toString(16).repeat(4).slice(0, 64)}`,
    estimatedTime: '30 seconds',
  };
};

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, twitterHandle, tweetUrl } = await request.json();
    const mockMode = request.nextUrl.searchParams.get('mock') !== 'false';
    const forceSuccess = request.nextUrl.searchParams.get('success') === 'true';
    const demoMode = request.nextUrl.searchParams.get('demo') === 'true';
    
    console.log('Flare verification request:', { walletAddress, twitterHandle, tweetUrl, mockMode, forceSuccess, demoMode });

    // Validation
    if (!walletAddress || !twitterHandle || !tweetUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, twitterHandle, tweetUrl' },
        { status: 400 }
      );
    }

    if (!validateWalletAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (!validateTwitterHandle(twitterHandle)) {
      return NextResponse.json(
        { error: 'Invalid Twitter handle format' },
        { status: 400 }
      );
    }

    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        { error: 'Invalid tweet URL format' },
        { status: 400 }
      );
    }

    const normalizedWallet = normalizeWalletAddress(walletAddress);
    const normalizedHandle = normalizeTwitterHandle(twitterHandle);
    const blockchainType = detectBlockchainType(walletAddress);
    const isCrosschainVerification = blockchainType === 'flow';

    console.log('Verification details:', {
      originalAddress: walletAddress,
      normalizedAddress: normalizedWallet,
      blockchainType,
      isCrosschainVerification
    });

    // Check if already verified (skip in demo mode)
    if (!demoMode && flareVerifications.has(normalizedWallet)) {
      return NextResponse.json(
        { error: 'Wallet address already verified via Flare' },
        { status: 409 }
      );
    }

    // In mock mode, simulate the entire FDC flow
    if (mockMode) {
      console.log('Running in mock mode - simulating FDC verification');
      
      // Generate mock Twitter user ID
      const mockTwitterUserId = Math.random().toString().slice(2, 12);
      
      // Simulate tweet content validation
      const expectedTweetContent = `Verifying my wallet ${walletAddress} on Flare Network #FlareNetwork #Web3Verification`;
      
      // Check if tweet contains the wallet address (simulation)
      // In reality, this would fetch the actual tweet via Twitter API or FDC
      console.log('Validating tweet content contains wallet address:', walletAddress);
      
      // Simulate cross-chain bridge if needed
      let bridgeInfo = null;
      if (isCrosschainVerification) {
        console.log('Initiating cross-chain verification from Flow to Flare');
        bridgeInfo = simulateCrosschainBridge(normalizedWallet, '0.001'); // 0.001 C2FLR for gas
        console.log('Cross-chain bridge simulation:', bridgeInfo);
      }
      
      // Simulate random validation failure to test error handling
      const shouldFail = !forceSuccess && Math.random() < 0.3; // 30% chance of failure for testing, unless forceSuccess is true
      
      if (shouldFail) {
        console.log('Mock validation failed - tweet does not contain wallet address');
        return NextResponse.json(
          { 
            error: 'Tweet does not contain the specified wallet address. Please ensure your tweet includes the exact wallet address provided.',
            details: {
              expectedWallet: normalizedWallet,
              expectedContent: expectedTweetContent,
              troubleshooting: [
                'Make sure you copied the exact wallet address from the form',
                'Verify the tweet contains the required hashtags: #FlareNetwork #Web3Verification',
                'The tweet must be public and accessible',
                'Wait a few minutes after posting before trying verification'
              ]
            }
          },
          { status: 400 }
        );
      }
      
      // Check for required hashtags
      const requiredHashtags = ['#FlareNetwork', '#Web3Verification'];
      const missingHashtags = requiredHashtags.filter(tag => !expectedTweetContent.includes(tag));
      
      if (missingHashtags.length > 0) {
        return NextResponse.json(
          { error: `Tweet is missing required hashtags: ${missingHashtags.join(', ')}` },
          { status: 400 }
        );
      }
      
      // Step 1: Simulate FDC request submission
      const mockFDCResponse = generateMockFDCResponse(tweetId, mockTwitterUserId, normalizedWallet);
      
      // Add actual tweet content validation to mock response
      mockFDCResponse.responseBody.tweet.text = expectedTweetContent;
      mockFDCResponse.responseBody.wallet_mentioned = true;
      mockFDCResponse.responseBody.verification_status = 'verified';
      
      // Step 2: Simulate blockchain transaction
      const mockTxHash = generateMockTxHash();
      
      // Step 3: Create verification record
      const verificationRecord = {
        walletAddress: normalizedWallet,
        originalWalletAddress: walletAddress, // Keep original format for display
        blockchainType,
        isCrosschainVerification,
        twitterHandle: normalizedHandle,
        verificationMethod: 'flare',
        verified: true,
        verifiedAt: new Date().toISOString(),
        tweetId,
        bridgeInfo, // Include cross-chain bridge info if applicable
        flareVerification: {
          requestId: mockFDCResponse.requestId,
          txHash: mockTxHash,
          tweetId,
          twitterUserId: mockTwitterUserId,
          twitterHandle: normalizedHandle,
          walletAddress: normalizedWallet,
          originalWalletAddress: walletAddress,
          blockchainType,
          fdcAttestation: {
            attestationId: `att_${Date.now()}`,
            merkleProof: mockFDCResponse.proof.merkleProof,
            consensusReached: true,
            validators: 7,
          }
        }
      };

      // Store verification
      flareVerifications.set(normalizedWallet, verificationRecord);
      
      console.log(`Mock Flare verification completed for wallet: ${normalizedWallet}`);

      return NextResponse.json({
        success: true,
        message: 'Twitter account successfully verified via Flare FDC (mock mode)',
        verification: verificationRecord,
        fdcResponse: mockFDCResponse,
        transactionHash: mockTxHash,
      });
    }

    // Real implementation would go here
    // This would involve:
    // 1. Submitting request to Flare FDC Hub
    // 2. Waiting for attestation processing
    // 3. Retrieving attestation response and proof
    // 4. Submitting verification to smart contract
    // 5. Waiting for transaction confirmation

    return NextResponse.json(
      { error: 'Real Flare verification not implemented yet. Please use mock mode.' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error in Flare verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get verification status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('wallet');
    const mockMode = url.searchParams.get('mock') !== 'false';

    if (!walletAddress || !validateWalletAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid or missing wallet address' },
        { status: 400 }
      );
    }

    const normalizedWallet = normalizeWalletAddress(walletAddress);
    const verification = flareVerifications.get(normalizedWallet);

    if (!verification) {
      return NextResponse.json({
        verified: false,
        message: 'No Flare verification found for this wallet address'
      });
    }

    return NextResponse.json(verification);

  } catch (error) {
    console.error('Error checking Flare verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}