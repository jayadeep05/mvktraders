package com.enterprise.investmentanalytics.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SchedulerService {

    @Scheduled(fixedRate = 3600000) // Every hour
    public void aggregateMonthlyProfits() {
        // Logic removed as MonthlyProfitSummary (redundant) is deprecated in Phase 1
        // Cleanup.
        // Current metrics are calculated dynamically in AnalyticsService.
    }
}
