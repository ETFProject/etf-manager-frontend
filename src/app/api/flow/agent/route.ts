import { NextRequest, NextResponse } from 'next/server';
import { 
  getServerProvider, 
  getContracts,
  formatAmount
} from '@/lib/flow-contracts';

export async function GET(_request: NextRequest) {
  try {
    console.log('📊 Getting Flow ETF agent data');
    
    // Get provider and contracts
    const provider = getServerProvider();
    const contracts = getContracts(provider);
    
    // Get agent data from ETF vault
    const agentWallet = await contracts.etfVault.agentWallet();
    const isAuthorized = await contracts.etfVault.authorizedAgents(agentWallet);
    const agentBalance = await provider.getBalance(agentWallet);
    const agentBalanceFormatted = formatAmount(agentBalance);
    
    console.log(`✅ Flow ETF agent wallet: ${agentWallet}`);
    console.log(`✅ Agent authorization status: ${isAuthorized}`);
    console.log(`✅ Agent balance: ${agentBalanceFormatted}`);
    
    // For demo purposes, generate some mock operation data
    const mockOperations = [
      {
        id: '0x' + Math.random().toString(16).slice(2),
        type: 'Rebalance',
        timestamp: new Date().toISOString(),
        targetToken: 'WFLOW',
        amount: '25',
        status: 'completed',
        txHash: '0x' + Math.random().toString(16).slice(2)
      },
      {
        id: '0x' + Math.random().toString(16).slice(2),
        type: 'Cross-Chain Transfer',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        targetToken: 'USDC',
        amount: '500',
        chainId: 1,
        status: 'completed',
        txHash: '0x' + Math.random().toString(16).slice(2)
      },
      {
        id: '0x' + Math.random().toString(16).slice(2),
        type: 'Fee Collection',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        amount: '0.05',
        status: 'completed',
        txHash: '0x' + Math.random().toString(16).slice(2)
      }
    ];
    
    // Return formatted response
    return NextResponse.json({
      success: true,
      data: {
        address: agentWallet,
        isAuthorized: isAuthorized,
        balance: agentBalanceFormatted,
        totalOperations: 142, // Mock data
        lastOperation: new Date().toISOString(),
        status: isAuthorized ? 'active' : 'inactive',
        operations: mockOperations
      }
    });
  } catch (error) {
    console.error('❌ Error fetching Flow ETF agent data:', error);
    
    // Return fallback data with an error flag
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Flow ETF agent data',
      data: {
        address: '0x7Fc6C6C0eFe82471e15d4bc1b49c60A22C6F103F', // Mock address
        isAuthorized: true,
        balance: '0.5 FLOW',
        totalOperations: 142,
        lastOperation: new Date().toISOString(),
        status: 'active',
        operations: []
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, agent, authorized } = await request.json();
    
    if (!action) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameter: action"
      }, { status: 400 });
    }
    
    console.log(`🔧 Processing agent action: ${action}`);
    
    // In a real implementation, you would use a private key to sign transactions
    // This is just for demonstration purposes
    
    if (action === 'setAgent' && agent) {
      // Simulate setting a new agent
      console.log(`✅ Setting new agent wallet: ${agent}`);
      
      return NextResponse.json({
        success: true,
        data: {
          txHash: `0x${Math.random().toString(16).slice(2)}`,
          action: 'setAgent',
          agent,
          timestamp: new Date().toISOString()
        }
      });
    } 
    else if (action === 'authorize' && agent) {
      // Simulate authorizing/deauthorizing an agent
      console.log(`✅ ${authorized ? 'Authorizing' : 'Deauthorizing'} agent: ${agent}`);
      
      return NextResponse.json({
        success: true,
        data: {
          txHash: `0x${Math.random().toString(16).slice(2)}`,
          action: 'authorize',
          agent,
          authorized,
          timestamp: new Date().toISOString()
        }
      });
    }
    else {
      return NextResponse.json({
        success: false,
        error: `Unsupported action: ${action}`
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error processing agent action:', error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to process agent action"
    }, { status: 500 });
  }
} 