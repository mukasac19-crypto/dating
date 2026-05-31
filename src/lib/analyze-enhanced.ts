//src\lib\analyze-enhanced.ts

import { ChatMessage, AnalysisResult, Flag, FlagCategory, TimelineEvent } from '@/types';
import OpenAI from 'openai';

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set!');
  throw new Error('OpenAI API key is required for analysis');
}

// Initialize the OpenAI client with error handling
let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
  throw new Error('OpenAI client initialization failed');
}

interface ConversationContext {
  userMessages: ChatMessage[];
  matchMessages: ChatMessage[];
  totalMessages: number;
  conversationDuration: string;
  messageFlow: MessageFlow[];
}

interface MessageFlow {
  index: number;
  sender: 'user' | 'match';
  content: string;
  timestamp: Date;
  responseTime?: number;
}

// --- MAIN ANALYSIS FUNCTION ---
export async function analyzeConversationWithContext(
  messages: ChatMessage[],
  metadata?: { platform?: string; userPosition?: 'left' | 'right'; userName?: string | null; }
): Promise<AnalysisResult> {

  // Validate input
  if (!messages || messages.length === 0) {
    throw new Error('No messages provided for analysis');
  }

  const context = createEnhancedConversationContext(messages);
  const userName = metadata?.userName?.trim() || null;

  // Perform all analyses in parallel for efficiency
  const [
    flagsResult,
    consistencyAnalysis,
    comprehensiveAnalysis,
    behavioralPatterns
  ] = await Promise.all([
    detectFlagsWithContextualAI(messages, context),
    analyzeConsistencyWithAI(messages, context),
    performComprehensiveAIAnalysis(messages, context, userName),
    analyzeBehavioralPatterns(messages, context)
  ]);

  const { rawRedFlags, greenFlags } = flagsResult;

  // Enrich flags with deep contextual insights
  const enrichedRedFlags = await enrichFlagsWithAIContext(
    rawRedFlags,
    messages,
    context,
    comprehensiveAnalysis.communicationPatterns,
    behavioralPatterns,
    userName
  );
  
  return {
    id: generateAnalysisId(),
    createdAt: new Date(),
    chatContent: messages,
    riskScore: comprehensiveAnalysis.scores.risk,
    trustScore: comprehensiveAnalysis.scores.trust,
    escalationIndex: comprehensiveAnalysis.scores.escalation,
    flags: [...enrichedRedFlags, ...greenFlags],
    timeline: comprehensiveAnalysis.timeline,
    reciprocityScore: comprehensiveAnalysis.communicationPatterns.reciprocity,
    consistencyAnalysis: consistencyAnalysis,
    suggestedReplies: comprehensiveAnalysis.suggestedReplies,
    evidence: extractDetailedEvidence({ redFlags: enrichedRedFlags, greenFlags }),
  };
}

// --- ENHANCED FLAG DETECTION WITH FULL CONTEXT ---
async function detectFlagsWithContextualAI(
  messages: ChatMessage[], 
  context: ConversationContext
): Promise<{ rawRedFlags: Flag[], greenFlags: Flag[] }> {
  
  // Create a more structured conversation with message indices for better tracking
  const conversationWithIndices = messages.map((msg, index) => ({
    index,
    id: msg.id,
    line: `[MSG_${index}] ${msg.sender.toUpperCase()}: ${msg.content}`,
    timestamp: msg.timestamp
  }));
  
  const conversationTranscript = conversationWithIndices.map(m => m.line).join('\n');
  
  const prompt = `
    You are an expert dating safety analyst with deep knowledge of manipulation tactics, romance scams, and healthy relationship patterns.
    
    CONVERSATION METADATA:
    - Total Duration: ${context.conversationDuration}
    - User Messages: ${context.userMessages.length}
    - Match Messages: ${context.matchMessages.length}
    - Message Pattern: ${describeMessagePattern(context.messageFlow)}

    CRITICAL INSTRUCTIONS:
    1. Analyze the ENTIRE conversation holistically to understand relationship dynamics
    2. Focus ONLY on the 'MATCH' person's behavior patterns
    3. Consider how behaviors evolve throughout the conversation
    4. Identify patterns that span multiple messages
    5. Look for subtle manipulation tactics and emotional progression
    6. Each message is labeled with [MSG_X] where X is the message index

    CONVERSATION:
    ---
    ${conversationTranscript}
    ---
    
    DEEP ANALYSIS REQUIREMENTS:
    Perform a thorough behavioral analysis considering:
    
    1. MANIPULATION PATTERNS:
       - Love bombing progression
       - Emotional manipulation tactics
       - Gaslighting attempts
       - Guilt-tripping or victim playing
       - Boundary testing and pushing
    
    2. SCAM INDICATORS:
       - Financial mentions or setups
       - Identity inconsistencies
       - Avoiding video calls or meetings
       - Urgent situations or emergencies
       - Too-good-to-be-true scenarios
    
    3. COMMUNICATION PATTERNS:
       - Response timing and availability
       - Message length and effort imbalance
       - Topic avoidance or deflection
       - Emotional escalation speed
       - Consistency in stories and details
    
    4. POSITIVE INDICATORS:
       - Genuine interest and curiosity
       - Respect for boundaries
       - Consistent communication
       - Emotional maturity
       - Transparency and openness
    
    Return a JSON object with "red_flags" and "green_flags" arrays.
    
    For each red flag pattern identified:
    {
      "category": (one of: 'financial_ask', 'love_bombing', 'urgency_pressure', 'boundary_violation', 
                  'identity_inconsistency', 'emotional_manipulation', 'avoidance_pattern', 'suspicious_behavior',
                  'gaslighting', 'isolation_attempt', 'timeline_inconsistency', 'guilt_tripping'),
      "severity": ('low', 'medium', 'high', 'critical'),
      "message": "Clear explanation of the concerning pattern observed",
      "triggering_messages": [array of MSG_X indices that contribute to this pattern],
      "pattern_description": "How this behavior manifests across the conversation",
      "manipulation_tactic": "If applicable, the specific manipulation technique being used",
      "risk_explanation": "Why this is concerning in the context of online dating",
      "evidence_quotes": [array of exact quotes that demonstrate this pattern]
    }

    For each green flag pattern identified:
    {
      "category": (one of: 'genuine_interest', 'respects_boundaries', 'consistent_communication', 
                  'emotional_maturity', 'transparency', 'healthy_pacing', 'mutual_respect',
                  'supportive_behavior', 'authentic_sharing', 'appropriate_vulnerability'),
      "message": "Clear explanation of the positive pattern",
      "triggering_messages": [array of MSG_X indices that demonstrate this pattern],
      "pattern_description": "How this positive behavior builds trust",
      "trust_indicator": "Why this suggests genuine intentions",
      "evidence_quotes": [array of exact quotes that support this]
    }

    IMPORTANT CONSIDERATIONS:
    - A single concerning statement might be part of a larger manipulation pattern
    - Look for escalation in emotional intensity or requests
    - Notice deflection when asked direct questions
    - Identify love bombing that progresses too quickly
    - Recognize healthy vs unhealthy vulnerability
    - Consider cultural differences but identify universal red flags
    
    Return ONLY the JSON object.
  `;

  const harassmentPrompt = `
CRITICAL HARASSMENT AND STALKING PATTERNS:

1. EXCESSIVE CONTACT:
   - Count empty messages or call indicators
   - 10+ unanswered calls = HIGH severity harassment
   - 50+ calls = CRITICAL severity stalking behavior
   
2. THIRD-PARTY CONTACT:
   - Any mention of contacting family/friends without permission
   - "I called your mom/friend" = CRITICAL boundary violation
   
3. CONTROL INDICATORS:
   - "You don't listen to me" type statements
   - Anger about not answering calls
   - Demanding immediate responses
   
4. ESCALATION PATTERNS:
   - Messages getting more aggressive over time
   - Threats (even subtle ones)
   - "I'll never give up on you" after being rejected

When you see 50+ call attempts, immediately flag as:
- category: "stalking_harassment"  
- severity: "critical"
- safety_level: "immediate_danger"
- message: "Extreme stalking behavior - 50+ unwanted contact attempts"
`;

  try {
    console.log('Starting contextual AI flag detection...');
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    });
    
    const messageContent = response.choices[0]?.message?.content;
    
    if (!messageContent) {
      console.error('No content returned from OpenAI');
      return { rawRedFlags: [], greenFlags: [] };
    }
    
    console.log('Raw OpenAI response length:', messageContent.length);
    console.log('First 200 chars:', messageContent.substring(0, 200));
    
    let parsed;
    try {
      parsed = JSON.parse(messageContent);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Invalid JSON content:', messageContent);
      
      // Try to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', innerError);
          return { rawRedFlags: [], greenFlags: [] };
        }
      } else {
        return { rawRedFlags: [], greenFlags: [] };
      }
    }
    
    const rawRedFlags: Flag[] = [];
    const greenFlags: Flag[] = [];

    // Process red flags with full context
    if (parsed.red_flags && Array.isArray(parsed.red_flags)) {
      for (const flag of parsed.red_flags) {
        // Get all messages that contribute to this flag
        let triggeringIndices: number[] = [];
        if (flag.triggering_messages) {
          if (Array.isArray(flag.triggering_messages)) {
            triggeringIndices = flag.triggering_messages
              .map((msg: any) => {
                // Handle different possible formats
                if (typeof msg === 'number') {
                  return msg;
                } else if (typeof msg === 'string') {
                  // Remove 'MSG_' prefix if present
                  const cleaned = msg.replace(/MSG_/i, '');
                  return parseInt(cleaned);
                } else {
                  console.warn('Unexpected triggering_message format:', msg);
                  return NaN;
                }
              })
              .filter((idx: number) => !isNaN(idx) && idx >= 0 && idx < messages.length);
          } else {
            console.warn('triggering_messages is not an array:', flag.triggering_messages);
          }
        }
        
        // Find the most representative message for this flag
        const primaryIndex = triggeringIndices[0];
        if (primaryIndex !== undefined && messages[primaryIndex]) {
          const primaryMessage = messages[primaryIndex];
          
          // Only create flags for match's behavior
          if (primaryMessage.sender === 'match') {
            const contextualFlag = createFlag(
              'red',
              flag.category || 'suspicious_behavior',
              flag.severity || 'medium',
              flag.message || 'Concerning behavior detected',
              primaryMessage
            );
            
            // Add rich context from AI analysis
            contextualFlag.meaning = flag.pattern_description;
            contextualFlag.whatToDo = generateSafetyAdvice(flag.category, flag.severity);
            contextualFlag.evidence = flag.evidence_quotes?.join(' | ') || primaryMessage.content;
            
            // Add manipulation tactic info if present
            if (flag.manipulation_tactic) {
              contextualFlag.message += ` (${flag.manipulation_tactic})`;
            }
            
            rawRedFlags.push(contextualFlag);
          }
        }
      }
    }

    // Process green flags with full context
    if (parsed.green_flags && Array.isArray(parsed.green_flags)) {
      for (const flag of parsed.green_flags) {
        // Get all messages that contribute to this flag
        let triggeringIndices: number[] = [];
        if (flag.triggering_messages) {
          if (Array.isArray(flag.triggering_messages)) {
            triggeringIndices = flag.triggering_messages
              .map((msg: any) => {
                // Handle different possible formats
                if (typeof msg === 'number') {
                  return msg;
                } else if (typeof msg === 'string') {
                  // Remove 'MSG_' prefix if present
                  const cleaned = msg.replace(/MSG_/i, '');
                  return parseInt(cleaned);
                } else {
                  console.warn('Unexpected triggering_message format:', msg);
                  return NaN;
                }
              })
              .filter((idx: number) => !isNaN(idx) && idx >= 0 && idx < messages.length);
          } else {
            console.warn('triggering_messages is not an array:', flag.triggering_messages);
          }
        }
        
        const primaryIndex = triggeringIndices[0];
        if (primaryIndex !== undefined && messages[primaryIndex]) {
          const primaryMessage = messages[primaryIndex];
          
          if (primaryMessage.sender === 'match') {
            const contextualFlag = createFlag(
              'green',
              flag.category || 'genuine_interest',
              'low',
              flag.message || 'Positive behavior detected',
              primaryMessage
            );
            
            contextualFlag.meaning = flag.pattern_description;
            contextualFlag.whatToDo = generatePositiveReinforcement(flag.category);
            contextualFlag.evidence = flag.evidence_quotes?.join(' | ') || primaryMessage.content;
            
            greenFlags.push(contextualFlag);
          }
        }
      }
    }

    console.log(`Contextual AI Analysis Complete: Found ${rawRedFlags.length} red flags and ${greenFlags.length} green flags`);
    return { rawRedFlags, greenFlags };
    
  } catch (error) {
    console.error("Contextual AI flag detection failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return { rawRedFlags: [], greenFlags: [] };
  }
}

// --- BEHAVIORAL PATTERN ANALYSIS ---
async function analyzeBehavioralPatterns(
  messages: ChatMessage[], 
  context: ConversationContext
): Promise<any> {
  const prompt = `
    Analyze the behavioral patterns in this dating conversation, focusing on psychological indicators.
    
    CONVERSATION:
    ${messages.map((m, i) => `[${i}] ${m.sender}: ${m.content}`).join('\n')}
    
    Identify:
    1. Attachment style indicators (secure, anxious, avoidant, disorganized)
    2. Communication style (assertive, passive, aggressive, passive-aggressive)
    3. Emotional regulation patterns
    4. Boundary setting and respecting behaviors
    5. Vulnerability and authenticity levels
    6. Power dynamics in the conversation
    7. Potential personality disorder indicators (narcissistic, borderline, antisocial traits)
    
    Return a JSON object with detailed behavioral analysis.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content from behavioral analysis');
      return {};
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Behavioral pattern analysis failed:', error);
    return {};
  }
}

// --- CONSISTENCY ANALYSIS WITH PROPER ERROR HANDLING ---
async function analyzeConsistencyWithAI(
  messages: ChatMessage[], 
  context: ConversationContext
): Promise<any> {
  const conversationTranscript = messages.map((msg, index) => 
    `[${index}] ${msg.sender.toUpperCase()}: ${msg.content}`
  ).join('\n');
  
  const prompt = `
    Perform a detailed consistency analysis of the MATCH's statements throughout this conversation.
    
    CONVERSATION:
    ${conversationTranscript}
    
    Analyze:
    1. Factual claims about personal life (job, location, family, etc.)
    2. Timeline consistency (when events supposedly happened)
    3. Emotional consistency (mood changes, personality shifts)
    4. Story details that change or evolve suspiciously
    5. Responses to direct questions (evasion, deflection, contradiction)
    6. Identity markers (age, profession, lifestyle) consistency
    
    Return a JSON object with EXACTLY this structure:
    {
      "claims": [
        {
          "id": "claim-1",
          "category": "job|location|personal|timeline|identity|lifestyle|other",
          "claim": "The actual claim text",
          "messageId": "msg-X",
          "timestamp": "2024-01-01T00:00:00Z"
        }
      ],
      "inconsistencies": [
        {
          "id": "inc-1",
          "description": "Description of the inconsistency",
          "claim1": {
            "id": "claim-1",
            "claim": "First claim text",
            "category": "category"
          },
          "claim2": {
            "id": "claim-2", 
            "claim": "Second claim text",
            "category": "category"
          },
          "severity": "minor|moderate|major"
        }
      ],
      "evasions": [
        {
          "id": "ev-1",
          "question": "The question that was asked",
          "messageId": "msg-X",
          "responseType": "deflected|vague|ignored|answered",
          "suspicionLevel": "low|medium|high"
        }
      ],
      "stabilityIndex": 85,
      "summary": "Overall assessment of truthfulness and consistency",
      "suspiciousPatterns": ["pattern 1", "pattern 2"]
    }
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content from consistency analysis');
      return getDefaultConsistencyAnalysis();
    }
    
    const result = JSON.parse(content);
    
    // Ensure proper structure with error handling
    return {
      claims: Array.isArray(result.claims) ? result.claims.map((claim: any) => ({
        id: claim.id || `claim-${Date.now()}-${Math.random()}`,
        category: claim.category || 'other',
        claim: claim.claim || 'Claim text not available',
        messageId: claim.messageId,
        timestamp: claim.timestamp || new Date().toISOString()
      })) : [],
      inconsistencies: Array.isArray(result.inconsistencies) ? 
        result.inconsistencies.map((inc: any, index: number) => ({
          id: inc.id || `inc-${Date.now()}-${index}`,
          description: inc.description || 'Inconsistency detected',
          claim1: typeof inc.claim1 === 'object' ? inc.claim1 : { 
            id: `claim1-${index}`,
            claim: inc.claim1 || 'First claim not available',
            category: 'other'
          },
          claim2: typeof inc.claim2 === 'object' ? inc.claim2 : { 
            id: `claim2-${index}`,
            claim: inc.claim2 || 'Second claim not available',
            category: 'other'
          },
          severity: inc.severity || 'moderate',
          type: inc.type || 'contradiction'
        })) : [],
      evasions: Array.isArray(result.evasions) ? result.evasions : [],
      stabilityIndex: typeof result.stabilityIndex === 'number' ? 
        Math.max(0, Math.min(100, result.stabilityIndex)) : 100,
      summary: result.summary || 'Analysis complete.',
      suspiciousPatterns: Array.isArray(result.suspiciousPatterns) ? 
        result.suspiciousPatterns : []
    };
    
  } catch (error) {
    console.error('AI consistency analysis failed:', error);
    return getDefaultConsistencyAnalysis();
  }
}

function getDefaultConsistencyAnalysis() {
  return { 
    claims: [], 
    inconsistencies: [], 
    evasions: [],
    stabilityIndex: 100, 
    summary: "Could not perform consistency analysis due to an error.",
    suspiciousPatterns: []
  };
}

// --- COMPREHENSIVE ANALYSIS WITH PSYCHOLOGICAL INSIGHTS ---
async function performComprehensiveAIAnalysis(
  messages: ChatMessage[],
  context: ConversationContext,
  userName: string | null = null
): Promise<any> {
  const conversationTranscript = messages.map((msg, i) =>
    `[${i}] ${msg.sender.toUpperCase()}: ${msg.content}`
  ).join('\n');

  const firstName = userName ? userName.split(/\s+/)[0] : null;
  const voiceInstruction = firstName
    ? `For any text shown to the reader (suggestedResponses, summary text), speak directly to them. Use "you". You may use "${firstName}" sparingly for warmth. NEVER use "the user" or third-person references to the reader.`
    : `For any text shown to the reader (suggestedResponses, summary text), speak directly to them using "you". NEVER use "the user" or third-person references to the reader.`;

  const prompt = `
    You are a senior psychologist and dating safety expert. Perform a comprehensive analysis of this conversation.

    VOICE (STRICT): ${voiceInstruction}

    METADATA:
    - Duration: ${context.conversationDuration}
    - Total Messages: ${context.totalMessages}
    - User Messages: ${context.userMessages.length}
    - Match Messages: ${context.matchMessages.length}
    - Average Response Times: ${calculateAverageResponseTimes(context.messageFlow)}

    CONVERSATION:
    ${conversationTranscript}
    
    Provide a deep analysis including:
    
    1. RISK ASSESSMENT (0-100):
       - Financial risk indicators
       - Emotional manipulation risk
       - Identity fraud risk
       - Physical safety concerns
       - Overall weighted risk score
    
    2. TRUST INDICATORS (0-100):
       - Consistency score
       - Transparency level
       - Respect indicators
       - Genuine interest markers
       - Overall trust score
    
    3. ESCALATION ANALYSIS (0-100):
       - Emotional intensity progression
       - Request escalation (personal info, meeting, etc.)
       - Boundary pushing rate
       - Timeline appropriateness
    
    4. COMMUNICATION PATTERNS:
       - Message length balance
       - Question reciprocity
       - Topic depth and breadth
       - Emotional availability
       - Response thoughtfulness
    
    5. PSYCHOLOGICAL PROFILE:
       - Likely attachment style
       - Emotional maturity level
       - Potential red flag personality traits
       - Manipulation tactics if any
    
    6. TIMELINE EVENTS:
       - Key emotional shifts
       - Important requests or revelations
       - Boundary testing moments
       - Trust-building or breaking events
    
    7. SUGGESTED RESPONSES:
       - Safe ways to test authenticity
       - Boundary-setting phrases
       - Questions to clarify concerns
       - De-escalation strategies if needed
    
    Return a comprehensive JSON object with all findings.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content from comprehensive analysis');
      return getDefaultComprehensiveAnalysis(context);
    }
    
    const analysis = JSON.parse(content);
    
    // Ensure all required fields exist with defaults
    return {
      scores: {
        risk: Math.max(0, Math.min(100, analysis.riskAssessment?.overall || analysis.risk || 50)),
        trust: Math.max(0, Math.min(100, analysis.trustIndicators?.overall || analysis.trust || 50)),
        escalation: Math.max(0, Math.min(100, analysis.escalationAnalysis?.overall || analysis.escalation || 50)),
      },
      communicationPatterns: {
        reciprocity: {
          questionsAskedByUser: context.userMessages.filter(m => m.content.includes('?')).length,
          questionsAskedByMatch: context.matchMessages.filter(m => m.content.includes('?')).length,
          personalInfoSharedByUser: analysis.communicationPatterns?.personalInfoSharedByUser || 0,
          personalInfoSharedByMatch: analysis.communicationPatterns?.personalInfoSharedByMatch || 0,
          averageMessageLengthUser: context.userMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, context.userMessages.length),
          averageMessageLengthMatch: context.matchMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, context.matchMessages.length),
          balanceScore: analysis.communicationPatterns?.reciprocity || 50,
        },
        summary: analysis.communicationPatterns?.summary || "Analysis unavailable",
      },
      timeline: Array.isArray(analysis.timeline) ? analysis.timeline.map((event: any) => ({
        timestamp: new Date(),
        type: event.type || 'emotional_shift',
        description: event.description || 'Event occurred',
        from: event.from || 'neutral',
        to: event.to || 'neutral'
      })) : [],
      suggestedReplies: Array.isArray(analysis.suggestedResponses) ? 
        analysis.suggestedResponses.map((reply: any, index: number) => ({
          id: `reply-${index}`,
          tone: reply.tone || 'neutral',
          content: reply.content || reply.message || 'No suggestion available',
          context: reply.context || 'General response',
          purpose: reply.purpose || 'Safe communication',
          safetyLevel: reply.safetyLevel || 'safe'
        })) : [],
      psychologicalProfile: analysis.psychologicalProfile || {},
    };
    
  } catch (error) {
    console.error('Comprehensive AI analysis failed:', error);
    return getDefaultComprehensiveAnalysis(context);
  }
}

function getDefaultComprehensiveAnalysis(context: ConversationContext) {
  return {
    scores: { risk: 50, trust: 50, escalation: 50 },
    communicationPatterns: { 
      reciprocity: {
        questionsAskedByUser: context.userMessages.filter(m => m.content.includes('?')).length,
        questionsAskedByMatch: context.matchMessages.filter(m => m.content.includes('?')).length,
        personalInfoSharedByUser: 0,
        personalInfoSharedByMatch: 0,
        averageMessageLengthUser: context.userMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, context.userMessages.length),
        averageMessageLengthMatch: context.matchMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, context.matchMessages.length),
        balanceScore: 50
      },
      summary: "Analysis could not be performed." 
    },
    timeline: [],
    suggestedReplies: [],
    psychologicalProfile: {},
  };
}

// --- ENRICHMENT WITH CONTEXTUAL ADVICE ---
async function enrichFlagsWithAIContext(
  rawFlags: Flag[],
  messages: ChatMessage[],
  context: ConversationContext,
  communicationPatterns: any,
  behavioralPatterns: any,
  userName: string | null = null
): Promise<Flag[]> {
  if (rawFlags.length === 0) return [];

  const conversationTranscript = messages.map(msg =>
    `${msg.sender.toUpperCase()}: ${msg.content}`
  ).join('\n');

  const flagsToAnalyze = rawFlags.map(flag => ({
    id: flag.id,
    category: flag.category,
    severity: flag.severity,
    message: flag.message,
    evidence: flag.evidence
  }));

  const firstName = userName ? userName.split(/\s+/)[0] : null;
  const voiceInstruction = firstName
    ? `Speak directly to the reader, whose first name is ${firstName}. Use "you" throughout. You may use "${firstName}" sparingly (at most once per field) for warmth — never in a clinical way. NEVER write "the user", "they should", "the person reading this", or any third-person reference to the reader.`
    : `Speak directly to the reader. Use "you" throughout. NEVER write "the user", "they should", "the person reading this", or any third-person reference to the reader. Refer to the other person in the chat as "this person", "they", or "your match".`;

  const prompt = `
    You are a dating safety expert and supportive friend. Provide detailed, actionable advice for each identified pattern.

    VOICE & TONE (STRICT):
    ${voiceInstruction}
    - Keep each field concise: one to two short sentences max. No lists inside fields.
    - Tone: warm, direct, calm. Not clinical, not preachy.
    - Plain English. No jargon like "boundaries enforcement" or "psychological progression".

    CONVERSATION CONTEXT:
    - Duration: ${context.conversationDuration}
    - Communication Balance: ${communicationPatterns?.reciprocity?.balanceScore || 50}/100
    - Behavioral Profile: ${JSON.stringify(behavioralPatterns || {})}

    CONVERSATION:
    ${conversationTranscript}

    FLAGS TO ANALYZE:
    ${JSON.stringify(flagsToAnalyze, null, 2)}

    For each flag, provide:

    {
      "FLAG_ID": {
        "meaning": "Short explanation of what's happening here — addressed to the reader as 'you'.",
        "psychological_insight": "What this likely says about their intentions — written to you, in plain English.",
        "whatToDo": "One or two short sentences of direct action you can take. Start with a verb (e.g., 'Ask...', 'Wait...', 'Don't share...'). Never start with 'The user'.",
        "boundary_suggestion": "How you might set a limit here — one short sentence.",
        "safety_level": "immediate_danger|high_caution|moderate_caution|low_concern|positive_sign",
        "aiSuggestedReply": {
          "content": "A reply you (the reader) could send — first person, written as if you're typing it.",
          "tone": "assertive|friendly|cautious|firm|supportive",
          "purpose": "What this reply does, in one short phrase."
        },
        "additional_questions": ["Short questions you could ask to test what they're really after"],
        "exit_strategy": "If you decide to step away, a short sentence on how to do it cleanly."
      }
    }

    Be direct about safety concerns. Your safety is the top priority.
    Return ONLY the JSON object.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content from flag enrichment');
      return rawFlags;
    }
    
    const enrichedData = JSON.parse(content);
    
    return rawFlags.map(flag => {
      const enrichment = enrichedData[flag.id];
      if (enrichment) {
        return {
          ...flag,
          meaning: enrichment.meaning,
          whatToDo: enrichment.whatToDo,
          aiSuggestedReply: enrichment.aiSuggestedReply,
          psychologicalInsight: enrichment.psychological_insight,
          safetyLevel: enrichment.safety_level,
          boundaryingSuggestion: enrichment.boundary_suggestion,
          additionalQuestions: enrichment.additional_questions,
          exitStrategy: enrichment.exit_strategy,
        } as Flag;
      }
      return flag;
    });
    
  } catch (error) {
    console.error('Flag enrichment failed:', error);
    return rawFlags;
  }
}

// --- HELPER FUNCTIONS ---

function createEnhancedConversationContext(messages: ChatMessage[]): ConversationContext {
  const userMessages = messages.filter(m => m.sender === 'user');
  const matchMessages = messages.filter(m => m.sender === 'match');
  
  // Create message flow with response times
  const messageFlow: MessageFlow[] = messages.map((msg, index) => {
    let responseTime = undefined;
    if (index < messages.length - 1) {
      const currentTime = new Date(msg.timestamp).getTime();
      const nextTime = new Date(messages[index + 1].timestamp).getTime();
      responseTime = (nextTime - currentTime) / 1000; // in seconds
    }
    
    return {
      index,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      responseTime
    };
  });
  
  const conversationDuration = calculateConversationDuration(messages);
  
  return {
    userMessages,
    matchMessages,
    totalMessages: messages.length,
    conversationDuration,
    messageFlow
  };
}

function calculateConversationDuration(messages: ChatMessage[]): string {
  if (messages.length < 2) return "Just started";
  
  const firstMsgTime = new Date(messages[0].timestamp).getTime();
  const lastMsgTime = new Date(messages[messages.length - 1].timestamp).getTime();
  const durationMs = lastMsgTime - firstMsgTime;
  
  const minutes = durationMs / (1000 * 60);
  const hours = minutes / 60;
  const days = hours / 24;
  
  if (days >= 1) {
    return `${Math.round(days)} day${days > 1 ? 's' : ''}`;
  } else if (hours >= 1) {
    return `${Math.round(hours)} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes >= 1) {
    return `${Math.round(minutes)} minute${minutes > 1 ? 's' : ''}`;
  }
  return "Just started";
}

function describeMessagePattern(messageFlow: MessageFlow[]): string {
  const userResponseTimes: number[] = [];
  const matchResponseTimes: number[] = [];
  
  // Calculate average response times inline
  for (let i = 0; i < messageFlow.length - 1; i++) {
    const responseTime = messageFlow[i].responseTime;
    if (responseTime !== undefined && responseTime > 0) {
      if (messageFlow[i].sender === 'match' && messageFlow[i + 1].sender === 'user') {
        userResponseTimes.push(responseTime);
      } else if (messageFlow[i].sender === 'user' && messageFlow[i + 1].sender === 'match') {
        matchResponseTimes.push(responseTime);
      }
    }
  }
  
  const avg = (times: number[]) => 
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  
  const matchAvgTime = avg(matchResponseTimes);
  const userMsgCount = messageFlow.filter(m => m.sender === 'user').length;
  const matchMsgCount = messageFlow.filter(m => m.sender === 'match').length;
  
  let pattern = "";
  if (matchMsgCount > userMsgCount * 1.5) {
    pattern = "Match is sending significantly more messages (possible love bombing)";
  } else if (userMsgCount > matchMsgCount * 1.5) {
    pattern = "User is sending more messages (possible low engagement from match)";
  } else {
    pattern = "Balanced message exchange";
  }
  
  if (matchAvgTime < 60 && matchAvgTime > 0) {
    pattern += "; Very quick responses from match";
  } else if (matchAvgTime > 3600) {
    pattern += "; Slow responses from match";
  }
  
  return pattern;
}

function calculateAverageResponseTimes(messageFlow: MessageFlow[]): string {
  const userResponseTimes: number[] = [];
  const matchResponseTimes: number[] = [];
  
  for (let i = 0; i < messageFlow.length - 1; i++) {
    const responseTime = messageFlow[i].responseTime;
    // Ensure responseTime is defined and is a valid number
    if (responseTime !== undefined && responseTime > 0) {
      if (messageFlow[i].sender === 'match' && messageFlow[i + 1].sender === 'user') {
        userResponseTimes.push(responseTime);
      } else if (messageFlow[i].sender === 'user' && messageFlow[i + 1].sender === 'match') {
        matchResponseTimes.push(responseTime);
      }
    }
  }
  
  const avg = (times: number[]) => 
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  
  const userAvg = avg(userResponseTimes);
  const matchAvg = avg(matchResponseTimes);
  
  return `User: ${Math.round(userAvg)}s, Match: ${Math.round(matchAvg)}s`;
}

function generateSafetyAdvice(category: string, severity: string): string {
  const advice: Record<string, Record<string, string>> = {
    financial_ask: {
      critical: "NEVER send money to someone you've only met online. This is a scam. Block and report immediately.",
      high: "Major red flag. Legitimate people don't ask for money early in relationships. Consider ending communication.",
      medium: "Be very cautious. Watch for escalation of financial requests. Do not share any financial information.",
      low: "Monitor for any escalation in financial discussions. Keep boundaries firm."
    },
    love_bombing: {
      critical: "Extreme manipulation tactic. This intense affection is not genuine. Protect yourself by creating distance.",
      high: "Classic manipulation pattern. Slow things down immediately and watch for angry reactions to boundaries.",
      medium: "Too much too fast. Legitimate connections develop gradually. Set clear pace boundaries.",
      low: "Slightly intense. Communicate your need for a slower pace."
    },
    emotional_manipulation: {
      critical: "You're being manipulated. This person is using psychological tactics to control you. Consider ending contact.",
      high: "Clear manipulation tactics detected. Do not engage with guilt trips or emotional blackmail.",
      medium: "Manipulation attempts present. Stay alert and don't let guilt drive your decisions.",
      low: "Minor manipulation tactics. Address directly and watch for escalation."
    },
    identity_inconsistency: {
      critical: "Strong indicators this person is not who they claim to be. Likely a scammer. Do not continue contact.",
      high: "Multiple identity red flags. Demand video verification before any further communication.",
      medium: "Some concerning inconsistencies. Ask direct questions and watch for deflection.",
      low: "Minor inconsistencies noted. Could be innocent but stay alert."
    }
  };
  
  return advice[category]?.[severity] || 
    "Be cautious and trust your instincts. If something feels off, it probably is.";
}

function generatePositiveReinforcement(category: string): string {
  const reinforcement: Record<string, string> = {
    genuine_interest: "This shows authentic curiosity about you as a person. A great sign of genuine connection!",
    respects_boundaries: "Respecting boundaries is crucial for healthy relationships. This person shows emotional maturity.",
    consistent_communication: "Consistency builds trust. This person's reliable communication is a positive indicator.",
    emotional_maturity: "Emotional intelligence is key to healthy relationships. This is very encouraging!",
    transparency: "Openness and honesty are foundational. This person seems genuine and trustworthy.",
    healthy_pacing: "Taking time to build connection properly. This shows patience and genuine interest.",
    mutual_respect: "Mutual respect is evident. This creates a strong foundation for healthy connection.",
    supportive_behavior: "Being genuinely supportive shows care and emotional availability.",
    authentic_sharing: "Appropriate vulnerability and authentic sharing builds real connection.",
    appropriate_vulnerability: "Sharing appropriately shows emotional intelligence and trust-building skills."
  };
  
  return reinforcement[category] || 
    "This is a positive sign of healthy communication and genuine interest!";
}

function extractDetailedEvidence(behavior: { redFlags: Flag[], greenFlags: Flag[] }): any[] {
  return [...behavior.redFlags, ...behavior.greenFlags].map((flag: Flag) => ({
    id: `evidence-${flag.id}`,
    messageId: flag.messageId,
    text: flag.evidence,
    flagId: flag.id,
    explanation: flag.message,
    category: flag.category,
    type: flag.type,
    severity: flag.severity
  }));
}

function generateAnalysisId(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createFlag(
  type: 'red' | 'green',
  category: FlagCategory,
  severity: 'low' | 'medium' | 'high' | 'critical',
  message: string,
  chatMessage: ChatMessage
): Flag {
  return {
    id: `flag-${Date.now()}-${Math.random()}`,
    type,
    category,
    severity: severity as 'low' | 'medium' | 'high', // Ensure it matches the type definition
    message,
    evidence: chatMessage.content,
    messageId: chatMessage.id,
    confidence: 0.95,
  };
}

// Export the main function
export default analyzeConversationWithContext;