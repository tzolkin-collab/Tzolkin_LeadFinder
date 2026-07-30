export * from './tools/index.js';
export { SerperClient, type SerperOrganicResult, type MetaAdsSearchResult } from './clients/serper.client.js';
export {
  ApifyClient,
  type ApifyInstagramProfile,
  type ApifyTikTokProfile,
  type ApifyLinkedInCompany,
  type ApifyMetaAdsResult,
} from './clients/apify.client.js';
export {
  BrasilApiClient,
  type BrasilApiCnpjData,
  type BrasilApiQsaItem,
} from './clients/brasil-api.client.js';
export {
  createCacheService,
  InMemoryCacheService,
  RedisCacheService,
  type CacheService,
} from './services/cache.service.js';
export {
  ReviewPipeline,
  type ReviewPipelineConfig,
  type ReviewPipelineInput,
  type ReviewPipelineResult,
} from './pipelines/review.pipeline.js';
export { CoreLogger, type LogLevel, type LogPayload } from './utils/logger.js';
export {
  defaultScannerConfig,
  getScannerConfig,
  type ScannerConfig,
} from './config/scanner.config.js';
export {
  relevanceFor,
  combineRelevance,
  isSignalRelevant,
  SPECIALTY_LABELS,
  type RelevanceWeight,
  type SpecialtyRelevance,
  type CombinedRelevance,
} from './services/specialty-relevance.service.js';
export {
  inferNeeds,
  matchNeedsToProvider,
  NEED_RULES,
  type NeedMechanism,
  type NeedRule,
  type InferredNeed,
  type MatchInput,
  type MatchResult,
} from './services/need-inference.service.js';
export { SignalService, type EvaluatedSignal } from './services/signal.service.js';
export { DiagnosticService, type CommercialDiagnosis } from './services/diagnostic.service.js';
export {
  OutboundPatternIntelligenceService,
  type PitchAuditResult,
  type RecordPatternOutcomeInput,
} from './services/outbound-pattern-intelligence.service.js';
export {
  KeywordTrendsService,
  type KeywordOpportunity,
  type CategoryTrendReport,
} from './services/keyword-trends.service.js';
export {
  SocialCommunityClient,
  type B2BCommunityMention,
  type B2BCommunityAnalysis,
} from './clients/social-community.client.js';
export {
  WebTrafficAnalyzerClient,
  type WebTrafficSignature,
} from './clients/web-traffic-analyzer.client.js';




