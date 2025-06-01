'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Copy, CheckCircle, AlertCircle } from "lucide-react";

// TypeScript declarations for MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Global state
let currentStep = 1;
let selectedMethod = 'tweet';
let userAccount: string | null = null;
let verificationRequestId: string | null = null;

export default function VerifyPage() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [twitterHandle, setTwitterHandle] = useState<string>("");
  const [tweetUrl, setTweetUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [method, setMethod] = useState<string>('tweet');
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState({
    submit: false,
    fdc: false,
    proof: false,
    complete: false,
  });
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [testMode, setTestMode] = useState<'success' | 'random'>('success');
  const [connectedWallet, setConnectedWallet] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Validate wallet address for multiple blockchains
  const validateWalletAddress = () => {
    const address = walletAddress.trim();
    
    if (address === '') {
      userAccount = null;
      return false;
    }
    
    // Check if it's a valid Ethereum/Flare address format (0x + 40 hex chars)
    const isEthereumStyle = /^0x[a-fA-F0-9]{40}$/.test(address);
    
    // Check if it's a valid Flow address format (8 or 16 hex chars without 0x)
    const isFlowStyle = /^[a-fA-F0-9]{8}$|^[a-fA-F0-9]{16}$/.test(address);
    
    // Check if it's a Flow address with 0x prefix
    const isFlowWithPrefix = /^0x[a-fA-F0-9]{8}$|^0x[a-fA-F0-9]{16}$/.test(address);
    
    if (isEthereumStyle || isFlowStyle || isFlowWithPrefix) {
      userAccount = address;
      return true;
    } else {
      userAccount = null;
      return false;
    }
  };

  // Detect blockchain type from address
  const detectBlockchainType = (address: string): 'ethereum' | 'flow' | 'unknown' => {
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return 'ethereum'; // Ethereum/Flare style
    } else if (/^[a-fA-F0-9]{8}$|^[a-fA-F0-9]{16}$|^0x[a-fA-F0-9]{8}$|^0x[a-fA-F0-9]{16}$/.test(address)) {
      return 'flow';
    }
    return 'unknown';
  };

  // Get wallet connection info
  const getWalletInfo = () => {
    if (!userAccount) return null;
    
    const blockchainType = detectBlockchainType(userAccount);
    return {
      address: userAccount,
      blockchain: blockchainType,
      needsCrosschainVerification: blockchainType === 'flow'
    };
  };

  // Select verification method
  const selectMethod = (methodName: string) => {
    setMethod(methodName);
    selectedMethod = methodName;
    
    // Enable next step
    setTimeout(() => {
      goToStep(2);
    }, 500);
  };

  // Update tweet content with wallet address
  const updateTweetContent = () => {
    if (userAccount) {
      return `Verifying my wallet ${userAccount} on Flare Network #FlareNetwork #Web3Verification`;
    }
    return `Verifying my wallet [WALLET_ADDRESS] on Flare Network #FlareNetwork #Web3Verification`;
  };

  // Copy tweet to clipboard
  const copyTweet = async () => {
    const tweetContent = updateTweetContent();
    try {
      await navigator.clipboard.writeText(tweetContent);
      toast({
        title: "Copied!",
        description: "Tweet copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  // Copy bio code to clipboard
  const copyBioCode = async () => {
    const bioCode = `flare-verify:${userAccount || '[WALLET_ADDRESS]'}`;
    try {
      await navigator.clipboard.writeText(bioCode);
      toast({
        title: "Copied!",
        description: "Bio code copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  // Start verification process
  const startVerification = async () => {
    if (!validateWalletAddress()) {
      toast({
        title: "Invalid Wallet Address",
        description: "Please enter a valid wallet address first to start verification",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let tweetId: string | null = null;
      
      if (selectedMethod === 'tweet') {
        if (!tweetUrl || !twitterHandle) {
          toast({
            title: "Missing Information",
            description: "Please fill in all fields",
            variant: "destructive",
          });
          return;
        }
        
        // Extract tweet ID from URL
        tweetId = extractTweetId(tweetUrl);
        if (!tweetId) {
          toast({
            title: "Invalid Tweet URL",
            description: "Please use format: https://twitter.com/username/status/1234567890",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Bio method
        if (!twitterHandle) {
          toast({
            title: "Missing Information",
            description: "Please enter your Twitter handle",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Clean twitter handle
      const cleanHandle = twitterHandle.replace('@', '');
      
      console.log('Starting verification with:', { tweetId, twitterHandle: cleanHandle, walletAddress: userAccount, method: selectedMethod });
      
      // Go to processing step
      goToStep(3);
      setLoading(true);
      
      // Call the appropriate API based on method
      if (selectedMethod === 'tweet') {
        await callFlareVerificationAPI(tweetId, cleanHandle);
      } else {
        await callBioVerificationAPI(cleanHandle);
      }
      
    } catch (error) {
      console.error('Error starting verification:', error);
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Call Flare verification API
  const callFlareVerificationAPI = async (tweetId: string | null, twitterHandle: string) => {
    try {
      // Step 1: Submit
      setProcessingSteps(prev => ({ ...prev, submit: true }));
      
      // Call the Flare verification API (with success=true for easier testing)
      const response = await fetch(`/api/verify-flare?mock=true&success=${testMode === 'success'}&demo=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: userAccount,
          twitterHandle,
          tweetUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Show detailed error message if available
        let errorMessage = errorData.error || 'Failed to verify via Flare';
        if (errorData.details?.troubleshooting) {
          errorMessage += '\n\nTroubleshooting:\n' + errorData.details.troubleshooting.map((tip: string) => `• ${tip}`).join('\n');
        }
        
        throw new Error(errorMessage);
      }

      // Step 2: FDC Processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingSteps(prev => ({ ...prev, fdc: true }));
      
      // Step 3: Proof Generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      setProcessingSteps(prev => ({ ...prev, proof: true }));
      
      // Step 4: Complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingSteps(prev => ({ ...prev, complete: true }));

      // Get the verification result
      const data = await response.json();
      
      setVerificationResult(data.verification);
      goToStep(4);
      setLoading(false);
      
      toast({
        title: "Verification Complete!",
        description: "Your Twitter account has been successfully verified on the Flare blockchain.",
      });

    } catch (error) {
      console.error('Flare verification error:', error);
      setLoading(false);
      goToStep(1); // Go back to start
      
      const errorMessage = error instanceof Error ? error.message : "An error occurred during verification";
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Call Bio verification API (placeholder for now)
  const callBioVerificationAPI = async (twitterHandle: string) => {
    try {
      // Step 1: Submit
      setProcessingSteps(prev => ({ ...prev, submit: true }));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: FDC Processing
      setProcessingSteps(prev => ({ ...prev, fdc: true }));
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 3: Proof Generation
      setProcessingSteps(prev => ({ ...prev, proof: true }));
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Complete
      setProcessingSteps(prev => ({ ...prev, complete: true }));
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock verification result for bio method
      const mockResult = {
        walletAddress: userAccount,
        twitterHandle,
        tweetId: null,
        verificationMethod: 'bio',
        requestId: `req_${Date.now()}`,
        txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
        verifiedAt: new Date().toISOString(),
      };

      setVerificationResult(mockResult);
      goToStep(4);
      setLoading(false);
      
      toast({
        title: "Verification Complete!",
        description: "Your Twitter account has been successfully verified on the Flare blockchain.",
      });
      
    } catch (error) {
      console.error('Bio verification error:', error);
      setLoading(false);
      goToStep(1); // Go back to start
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "An error occurred during verification",
        variant: "destructive",
      });
    }
  };

  // Extract tweet ID from URL
  const extractTweetId = (url: string): string | null => {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  // Restart verification
  const restartVerification = () => {
    setStep(1);
    setMethod('tweet');
    setWalletAddress('');
    setTwitterHandle('');
    setTweetUrl('');
    setVerificationCode('');
    setProcessingSteps({
      submit: false,
      fdc: false,
      proof: false,
      complete: false,
    });
    setVerificationResult(null);
    currentStep = 1;
    selectedMethod = 'tweet';
    userAccount = null;
    verificationRequestId = null;
  };

  // Go to step
  const goToStep = (stepNumber: number) => {
    setStep(stepNumber);
    currentStep = stepNumber;
  };

  // Update wallet address and validate
  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWalletAddress(value);
    
    if (value) {
      validateWalletAddress();
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setConnectedWallet({
          address,
          blockchain: detectBlockchainType(address)
        });
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${address.substring(0, 6)}...${address.substring(38)}`,
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to MetaMask",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch to Flare Testnet
  const switchToFlareTestnet = async () => {
    if (!window.ethereum) return;

    try {
      // Try to switch to Flare Coston2 testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x72' }], // Coston2 testnet chain ID (114 in hex)
      });
      
      toast({
        title: "Network Switched",
        description: "Successfully switched to Flare Coston2 testnet",
      });
    } catch (switchError: any) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x72',
              chainName: 'Flare Testnet Coston2',
              nativeCurrency: {
                name: 'Coston2 Flare',
                symbol: 'C2FLR',
                decimals: 18,
              },
              rpcUrls: ['https://coston2-api.flare.network/ext/C/rpc'],
              blockExplorerUrls: ['https://coston2-explorer.flare.network'],
            }],
          });
          
          toast({
            title: "Network Added",
            description: "Flare Coston2 testnet added and switched successfully",
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          toast({
            title: "Failed to Add Network",
            description: "Please add Flare Coston2 testnet manually",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-cyan-400 text-3xl mr-3">🐦</div>
            <h1 className="text-4xl font-bold text-white">Flare Twitter Verification</h1>
          </div>
          <p className="text-purple-200">
            Connect your Twitter account to verify your identity on the Flare blockchain
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
            
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {stepNum}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {stepNum === 1 ? 'Choose Method' :
                   stepNum === 2 ? 'Verify' :
                   stepNum === 3 ? 'Process' : 'Complete'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Step 1: Choose Method */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose Verification Method</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Tweet Verification */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    method === 'tweet' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => selectMethod('tweet')}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🐦</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Tweet Verification</h3>
                    <div className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full mb-3">
                      Recommended
                    </div>
                    <p className="text-gray-600 text-sm">
                      Post a tweet with your wallet address. This method is quick and secure.
                    </p>
                  </div>
                </div>

                {/* Bio Verification */}
                <div 
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    method === 'bio' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => selectMethod('bio')}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🔐</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Bio Verification</h3>
                    <div className="h-6 mb-3"></div>
                    <p className="text-gray-600 text-sm">
                      Add a verification code to your Twitter bio for identity confirmation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallet Address Input */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Wallet Address
                </label>
                
                <div className="space-y-3">
                  {/* Wallet Connection Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={connectWallet}
                      disabled={isConnecting}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          🦊 Connect MetaMask
                        </>
                      )}
                    </Button>
                    
                    {connectedWallet && (
                      <Button
                        onClick={switchToFlareTestnet}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        🔄 Switch to Flare
                      </Button>
                    )}
                  </div>
                  
                  {/* Manual Address Input */}
                  <Input
                    type="text"
                    placeholder="Enter wallet address (Ethereum: 0x... or Flow: 1a2b3c4d...)"
                    value={walletAddress}
                    onChange={handleWalletChange}
                    className="text-center"
                  />
                  
                  {/* Cross-chain Info */}
                  {walletAddress && (
                    <div className="p-3 rounded-lg border">
                      {(() => {
                        const walletInfo = getWalletInfo();
                        if (!walletInfo) return null;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Detected Blockchain:</span>
                              <span className={`font-medium ${
                                walletInfo.blockchain === 'flow' ? 'text-green-600' : 
                                walletInfo.blockchain === 'ethereum' ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {walletInfo.blockchain === 'flow' ? '🌊 Flow' :
                                 walletInfo.blockchain === 'ethereum' ? '⚡ Ethereum/Flare' : '❓ Unknown'}
                              </span>
                            </div>
                            
                            {walletInfo.needsCrosschainVerification && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                                <div className="flex items-start gap-2">
                                  <div className="text-blue-500 mt-0.5">ℹ️</div>
                                  <div>
                                    <div className="font-medium text-blue-800 mb-1">Cross-Chain Verification</div>
                                    <div className="text-blue-700">
                                      Your Flow wallet will be verified and the verification recorded on Flare blockchain. 
                                      Gas fees will be paid automatically through our cross-chain bridge.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-blue-600">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Supports Flow, Ethereum, and Flare wallet addresses
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Verify Your Twitter Account</h2>
              
              {method === 'tweet' ? (
                <div className="space-y-6">
                  {/* Tweet Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">📝 Step 1: Create a Tweet</h3>
                    <p className="text-gray-600 mb-4">Post this exact tweet to verify your wallet address:</p>
                    
                    <div className="bg-white border rounded-lg p-4 mb-4">
                      <div className="text-gray-800 text-sm mb-3 font-mono">
                        {updateTweetContent()}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyTweet}
                        className="mr-2"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Tweet
                      </Button>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm text-yellow-800">
                      <strong>Testing Note:</strong> In {testMode === 'success' ? 'success mode' : 'random mode'}, 
                      {testMode === 'success' 
                        ? ' verification will always succeed regardless of actual tweet content.' 
                        : ' there\'s a 30% chance verification will fail to test error handling.'
                      }
                    </div>
                    
                    <Button 
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(updateTweetContent())}`, '_blank')}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      🐦 Open Twitter
                    </Button>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔗 Step 2: Paste Tweet URL
                      </label>
                      <Input
                        type="text"
                        placeholder="https://twitter.com/username/status/1234567890"
                        value={tweetUrl}
                        onChange={(e) => setTweetUrl(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👤 Step 3: Your Twitter Handle
                      </label>
                      <Input
                        type="text"
                        placeholder="@username"
                        value={twitterHandle}
                        onChange={(e) => setTwitterHandle(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bio Instructions */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">🔐 Bio Verification</h3>
                    <p className="text-gray-600 mb-4">Add this verification code to your Twitter bio:</p>
                    
                    <div className="bg-white border rounded-lg p-4 mb-4">
                      <code className="text-gray-800 text-sm font-mono">
                        flare-verify:{userAccount || '[WALLET_ADDRESS]'}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyBioCode}
                        className="ml-3"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                  
                  {/* Input Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👤 Your Twitter Handle
                    </label>
                    <Input
                      type="text"
                      placeholder="@username"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="mt-8">
                <Button
                  onClick={startVerification}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting Verification...
                    </>
                  ) : (
                    <>
                      🛡️ Start Verification
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Process */}
          {step === 3 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Processing Verification</h2>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Submitting to Flare Data Connector...</h3>
                <p className="text-gray-600">Please wait while we verify your Twitter account on the blockchain.</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'submit', icon: '📤', text: 'Submitting verification request', step: processingSteps.submit },
                  { key: 'fdc', icon: '🔍', text: 'FDC processing Twitter data', step: processingSteps.fdc },
                  { key: 'proof', icon: '🏆', text: 'Generating cryptographic proof', step: processingSteps.proof },
                  { key: 'complete', icon: '✅', text: 'Verification complete', step: processingSteps.complete },
                ].map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        item.step ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {item.step ? <CheckCircle className="w-5 h-5 text-green-500" /> : item.icon}
                      </div>
                      <span className="font-medium text-gray-800">{item.text}</span>
                    </div>
                    {item.step ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="p-8 text-center">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">🎉 Successfully Verified!</h2>
                <p className="text-gray-600">Your Twitter account has been verified and recorded on the Flare blockchain.</p>
              </div>

              {verificationResult && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold text-gray-800 mb-4">Verification Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Wallet Address:</span>
                      <span className="font-mono text-gray-800">{verificationResult.originalWalletAddress || verificationResult.walletAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Blockchain:</span>
                      <span className="text-gray-800">
                        {verificationResult.blockchainType === 'flow' ? '🌊 Flow' : 
                         verificationResult.blockchainType === 'ethereum' ? '⚡ Ethereum/Flare' : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Twitter Account:</span>
                      <span className="text-gray-800">@{verificationResult.twitterHandle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request ID:</span>
                      <span className="font-mono text-gray-800">{verificationResult.flareVerification?.requestId || verificationResult.requestId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Verification Time:</span>
                      <span className="text-gray-800">{new Date(verificationResult.verifiedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Cross-chain Bridge Info */}
                  {verificationResult.bridgeInfo && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-medium text-blue-800 mb-2">🌉 Cross-Chain Bridge</h4>
                      <div className="space-y-1 text-sm text-blue-700">
                        <div className="flex justify-between">
                          <span>Bridge ID:</span>
                          <span className="font-mono">{verificationResult.bridgeInfo.bridgeId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Route:</span>
                          <span>{verificationResult.bridgeInfo.sourceChain} → {verificationResult.bridgeInfo.destinationChain}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gas Amount:</span>
                          <span>{verificationResult.bridgeInfo.gasAmount} C2FLR</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="text-green-600 font-medium">✅ {verificationResult.bridgeInfo.bridgeStatus}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">🔗 Blockchain Verification</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Your verification has been recorded on the Flare blockchain, providing secure and immutable proof of your Twitter identity.
                </p>
                {verificationResult && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://coston2-explorer.flare.network/tx/${verificationResult.txHash}`, '_blank')}
                  >
                    View on Explorer
                  </Button>
                )}
              </div>

              <Button
                onClick={restartVerification}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Verify Another Account
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-purple-200">
          <p className="mb-2">Powered by <strong>Flare Network FDC</strong> (Flare Data Connector)</p>
          
          {/* Testing Mode Toggle */}
          <div className="mb-4 p-3 bg-purple-800/50 rounded-lg">
            <label className="text-sm text-purple-100 block mb-2">Testing Mode:</label>
            <select 
              value={testMode} 
              onChange={(e) => setTestMode(e.target.value as 'success' | 'random')}
              className="bg-purple-700 text-purple-100 border border-purple-600 rounded px-3 py-1 text-sm"
            >
              <option value="success">Always Success (for testing)</option>
              <option value="random">Random (30% failure rate)</option>
            </select>
            <p className="text-xs text-purple-300 mt-1">
              {testMode === 'success' ? 'Verification will always succeed' : 'Verification may fail to test error handling'}
            </p>
            <div className="mt-2 p-2 bg-green-600/20 border border-green-400/30 rounded text-xs text-green-200">
              <strong>🎭 Demo Mode:</strong> Multiple verifications of the same wallet are allowed for demonstration purposes
            </div>
          </div>
          
          <div className="flex justify-center space-x-6 text-sm">
            <a href="https://dev.flare.network/fdc/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              FDC Documentation
            </a>
            <a href="https://coston2-explorer.flare.network" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              Coston2 Explorer
            </a>
            <a href="https://faucet.flare.network/coston2" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              C2FLR Faucet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 