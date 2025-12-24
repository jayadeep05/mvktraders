package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchJobService {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    // private final MonthlyProfitRepository monthlyProfitSummaryRepository; //
    // Removed

    // Cron: At 00:00:00am every day
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void aggregateMonthlyProfits() {
        log.info("Starting monthly profit aggregation job - Disabled in Phase 1 Cleanup");
        // Logic removed as MonthlyProfitSummary is deprecated.
        log.info("Completed monthly profit aggregation job");
    }
}
