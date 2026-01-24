package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchJobService {

    private final ProfitCalculationService profitCalculationService;
    private final GlobalConfigService configService;

    // Track the last time we ran the profit calculation
    private final AtomicReference<LocalDateTime> lastRunTime = new AtomicReference<>(LocalDateTime.now().minusDays(1));

    // Poll every 30 seconds to see if we need to run the job
    @Scheduled(fixedRateString = "${app.scheduling.profit-calculation-rate:30000}")
    public void attemptProfitCalculation() {
        try {
            // 1. Get Config
            int durationValue = configService.getInt(GlobalConfigService.PROFIT_DURATION_VALUE);
            String durationUnit = configService.getValue(GlobalConfigService.PROFIT_DURATION_UNIT); // MINUTES, HOURS,
                                                                                                    // DAYS, MONTHS

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime nextRunTime = calculateNextRunTime(lastRunTime.get(), durationValue, durationUnit);

            if (now.isAfter(nextRunTime) || now.isEqual(nextRunTime)) {
                log.info("Triggering Profit Calculation. Now: {}, NextRun: {}", now, nextRunTime);

                // Trigger Calculation
                profitCalculationService.calculateProfitBatch(now);

                // Update last run time
                lastRunTime.set(now);
            }

        } catch (Exception e) {
            log.error("Error in dynamic profit scheduler: {}", e.getMessage(), e);
        }
    }

    private LocalDateTime calculateNextRunTime(LocalDateTime lastRun, int value, String unit) {
        if (lastRun == null)
            return LocalDateTime.MIN;

        switch (unit.toUpperCase()) {
            case "MINUTES":
                return lastRun.plusMinutes(value);
            case "HOURS":
                return lastRun.plusHours(value);
            case "DAYS":
                return lastRun.plusDays(value);
            case "MONTHS":
                return lastRun.plusMonths(value);
            default:
                return lastRun.plusMonths(1); // Default
        }
    }
}
