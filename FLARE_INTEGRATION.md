# Flare Blockchain Integration

This document describes the Flare blockchain verification features integrated into the ETF Manager Frontend.

## 🌟 Overview

The Flare integration adds decentralized Twitter verification using Flare's FDC (Flare Data Connector) and Web2Json attestation type. This provides trustless, cryptographically verifiable social media identity proofs.

## 🔧 Features

### 1. **Traditional Verification Methods**
- **Bio Verification**: Add verification code to Twitter bio
- **Tweet Verification**: Post tweet with wallet address and hashtags

### 2. **Flare Blockchain Verification (NEW)**
- **FDC Integration**: Uses Flare's enshrined oracle system
- **Web2Json Attestation**: Leverages Flare's Web2Json attestation type
- **On-chain Verification**: All verification logic is transparent and on-chain
- **Cryptographic Proofs**: Generates Merkle proofs for data integrity

## 🚀 How Flare Verification Works

1. **User Posts Tweet**: Tweet contains wallet address and specific hashtags
2. **FDC Request**: System submits verification request to Flare Data Connector
3. **Data Retrieval**: FDC fetches tweet data from Twitter API using Web2Json
4. **Proof Generation**: Creates cryptographic Merkle proof of the verified data
5. **Blockchain Recording**: Smart contract verifies proof and records verification
6. **Completion**: User's wallet is now verifiably linked to their Twitter account

## 🛠️ Technical Implementation

### Frontend Components

- **Enhanced Verify Page** (`src/app/verify/page.tsx`)
  - Three-tab interface: Bio, Tweet, and Flare verification
  - Real-time processing status with 4-step progress indicator
  - Automatic tweet template generation
  - Copy-to-clipboard functionality
  - Direct Twitter posting integration

### API Endpoints

- **Flare Verification API** (`src/app/api/verify-flare/route.ts`)
  - POST: Submit verification request
  - GET: Check verification status
  - Mock mode for development and testing
  - FDC response simulation

### Key Features

- **Progress Tracking**: Visual feedback for all FDC processing steps
- **Error Handling**: Comprehensive validation and error messages
- **Mock Mode**: Development-friendly simulation of blockchain interactions
- **Responsive Design**: Works on desktop and mobile devices

## 🌐 Network Configuration

### Coston2 Testnet (Current)
```typescript
const FLARE_CONFIG = {
  chainId: 114,
  rpcUrl: 'https://coston2-api.flare.network/ext/C/rpc',
  explorerUrl: 'https://coston2-explorer.flare.network',
  fdcHub: '0x3e52461Be1e4feFbF1CB98C0189f14cb96608C56',
  fdcVerification: '0x07f96C4Eb1Ff75e0e626169A9D7C278d46655Bc3',
};
```

### Environment Variables
```env
FLARE_CONTRACT_ADDRESS=your_deployed_contract_address
```

## 📋 Usage Instructions

### For Users

1. **Navigate to Verify Page**: Go to `/verify` in the application
2. **Choose Flare Tab**: Select "Flare Blockchain" verification method
3. **Enter Details**: Input wallet address and Twitter handle
4. **Copy Tweet Template**: Use the provided verification tweet text
5. **Post Tweet**: Post the tweet to your Twitter account
6. **Submit URL**: Paste the tweet URL back into the form
7. **Wait for Processing**: Watch the 4-step verification process
8. **Verification Complete**: Receive on-chain verification proof

### For Developers

1. **Enable Mock Mode**: Set `MOCK_API_ENABLED = true` for development
2. **Test Verification**: Use the mock endpoints for testing
3. **Deploy Contract**: Deploy your verification contract to Coston2
4. **Update Config**: Set your contract address in environment variables
5. **Production Mode**: Set `MOCK_API_ENABLED = false` for production

## 🔒 Security Features

- **Input Validation**: Comprehensive validation of all user inputs
- **Wallet Format Checking**: Validates Ethereum address format
- **Twitter Handle Validation**: Ensures proper Twitter username format
- **Tweet URL Parsing**: Extracts and validates tweet IDs from URLs
- **Duplicate Prevention**: Prevents multiple verifications for same wallet

## 📊 Verification Data Structure

```typescript
interface FlareVerificationResult {
  requestId: string;           // Unique FDC request identifier
  txHash: string;             // Blockchain transaction hash
  tweetId: string;            // Twitter tweet ID
  twitterUserId: string;      // Twitter user ID
  twitterHandle: string;      // Twitter username
  walletAddress: string;      // Ethereum wallet address
  fdcAttestation: {
    attestationId: string;    // FDC attestation identifier
    merkleProof: string;      // Cryptographic proof
    consensusReached: boolean; // Validator consensus status
    validators: number;       // Number of validating nodes
  };
}
```

## 🔮 Future Enhancements

### Planned Features
- [ ] **Mainnet Support**: Deploy to Flare mainnet
- [ ] **Batch Verification**: Support multiple account verification
- [ ] **Enhanced Privacy**: Zero-knowledge proof integration
- [ ] **Multi-Platform**: Support for additional social platforms
- [ ] **OAuth Integration**: Direct Twitter OAuth flow
- [ ] **Advanced Analytics**: Verification statistics and insights

### Technical Improvements
- [ ] **Real FDC Integration**: Replace mock with actual FDC calls
- [ ] **Smart Contract Deployment**: Automated contract deployment
- [ ] **Gas Optimization**: Optimize transaction costs
- [ ] **Error Recovery**: Improved error handling and retry mechanisms
- [ ] **Performance Monitoring**: Real-time performance metrics

## 🆘 Troubleshooting

### Common Issues

1. **Invalid Tweet URL**
   - Ensure URL format: `https://twitter.com/username/status/1234567890`
   - Check tweet is public and accessible

2. **Verification Timeout**
   - FDC processing may take several minutes
   - Check Coston2 network status

3. **Wallet Already Verified**
   - Each wallet can only be verified once
   - Use verification status check to confirm

4. **Mock Mode Issues**
   - Ensure `MOCK_API_ENABLED = true` for development
   - Check console logs for detailed error messages

### Support Resources

- [Flare Developer Documentation](https://dev.flare.network/)
- [FDC Overview](https://dev.flare.network/fdc/overview/)
- [Coston2 Testnet Faucet](https://faucet.flare.network/coston2)
- [Flare Discord Community](https://discord.gg/flare)

## 📄 Integration Benefits

### For Users
- **Trustless Verification**: No central authority required
- **Permanent Record**: Verification stored immutably on blockchain
- **Privacy Focused**: Only necessary data is recorded
- **Universal Access**: Works with any Ethereum-compatible wallet

### For Developers
- **Open Source**: Fully transparent verification logic
- **Composable**: Can be integrated with other DApps
- **Reliable**: Uses Flare's battle-tested oracle infrastructure
- **Cost Effective**: Minimal gas costs for verification

---

**Built with ❤️ using [Flare Network](https://flare.network/) FDC technology** 