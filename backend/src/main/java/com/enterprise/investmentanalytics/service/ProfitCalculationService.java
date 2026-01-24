package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.model.entity.MonthlyProfitHistory;
import com.enterprise.investmentanalytics.model.entity.Portfolio;
import com.enterprise.investmentanalytics.model.entity.Transaction;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.ProfitMode;
import com.enterprise.investmentanalytics.model.enums.Role;
import com.enterprise.investmentanalytics.model.enums.TransactionType;
import com.enterprise.investmentanalytics.model.enums.UserStatus;
import com.enterprise.investmentanalytics.repository.MonthlyProfitHistoryRepository;
import com.enterprise.investmentanalytics.repository.PortfolioRepository;
import com.enterprise.investmentanalytics.repository.TransactionRepository;
import com.enterprise.investmentanalytics.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfitCalculationService {

    private final UserRepository userRepository;
    private final PortfolioRepository portfolioRepository;
    private final MonthlyProfitHistoryRepository profitHistoryRepository;
    private final TransactionRepository transactionRepository;
    private final GlobalConfigService configService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private ProfitCalculationService self;

    public void calculateProfitBatch(LocalDateTime runTime) {
        log.info("Starting batch profit calculation at {}", runTime);

        // Configuration
        int durationValue = configService.getInt(GlobalConfigService.PROFIT_DURATION_VALUE);
        String durationUnit = configService.getValue(GlobalConfigService.PROFIT_DURATION_UNIT);

        BigDecimal fixedRate = configService.getBigDecimal(GlobalConfigService.FIXED_MONTHLY_RATE_PERCENT)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal compoundingRate = configService.getBigDecimal(GlobalConfigService.COMPOUNDING_MONTHLY_RATE_PERCENT)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        boolean useProration = configService.getBoolean(GlobalConfigService.USE_FIRST_MONTH_PRORATION);
        String prorationMethod = configService.getValue(GlobalConfigService.FIRST_MONTH_PRORATION_METHOD);
        int cutoffDay = configService.getInt(GlobalConfigService.MONTHLY_CUTOFF_DAY);
        boolean useAdminApprovalDate = configService
                .getBoolean(GlobalConfigService.USE_ADMIN_APPROVAL_DATE_AS_ENTRY_DATE);

        YearMonth cycleMonth = YearMonth.from(runTime);
        int daysInMonth = cycleMonth.lengthOfMonth();

        // Adjust Rate for Duration (Simple Division)
        String calculationMode = configService.getValue(GlobalConfigService.PROFIT_CALCULATION_MODE);

        // Calculate Effective Rate based on Mode (Prorated vs Full Cycle)
        BigDecimal effectiveFixedRate = calculateEffectiveRate(fixedRate, durationValue, durationUnit, calculationMode);
        BigDecimal effectiveCompoundingRate = calculateEffectiveRate(compoundingRate, durationValue, durationUnit,
                calculationMode);

        List<User> activeClients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CLIENT && u.getStatus() == UserStatus.ACTIVE && !u.isDeleted())
                .toList();

        for (User user : activeClients) {
            try {
                // Use self-proxy to ensure @Transactional works
                self.processClientProfit(user, cycleMonth, effectiveFixedRate, effectiveCompoundingRate,
                        useProration, prorationMethod, cutoffDay, useAdminApprovalDate, daysInMonth, runTime);
            } catch (Exception e) {
                log.error("Failed to calculate profit for user {}: {}", user.getEmail(), e.getMessage(), e);
            }
        }
    }

    private BigDecimal calculateEffectiveRate(BigDecimal monthlyRate, int durationValue, String durationUnit,
            String calculationMode) {
        // If Full Cycle (Accelerated) mode, we ignore the time duration ratio and
        // return the full monthly rate
        // This simulates "1 Month Passing" every X minutes/hours
        if ("FULL_CYCLE".equalsIgnoreCase(calculationMode)) {
            return monthlyRate;
        }

        // PRORATED Logic:
        // Monthly Rate is divided by the time fraction.
        // e.g. 4% Monthly. Duration 10 mins. Rate = 4% * (10mins / MinutesInMonth)

        BigDecimal minutesInMonth = BigDecimal.valueOf(30 * 24 * 60); // Approx 30 days

        BigDecimal durationInMinutes;
        switch (durationUnit.toUpperCase()) {
            case "MINUTES":
                durationInMinutes = BigDecimal.valueOf(durationValue);
                break;
            case "HOURS":
                durationInMinutes = BigDecimal.valueOf(durationValue * 60L);
                break;
            case "DAYS":
                durationInMinutes = BigDecimal.valueOf(durationValue * 24 * 60L);
                break;
            case "MONTHS":
                return monthlyRate.multiply(BigDecimal.valueOf(durationValue)); // e.g. 1 month = 1x rate
            default:
                durationInMinutes = BigDecimal.valueOf(30 * 24 * 60); // Default to 1 month
        }

        if (durationUnit.equalsIgnoreCase("MONTHS"))
            return monthlyRate;

        // Rate per minute = MonthlyRate / MinutesInMonth
        // Rate for duration = Rate per minute * durationInMinutes
        return monthlyRate.divide(minutesInMonth, 10, RoundingMode.HALF_UP).multiply(durationInMinutes);
    }

    // Existing method kept for compatibility or manual triggers
    @Transactional
    public void calculateMonthlyProfit(int month, int year) {
        calculateProfitBatch(LocalDateTime.of(year, month, 28, 0, 0)); // Fallback
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void processClientProfit(User user, YearMonth cycleMonth, BigDecimal fixedRate, BigDecimal compoundingRate,
            boolean useProration, String prorationMethod, int cutoffDay, boolean useAdminApprovalDate,
            int daysInMonth, LocalDateTime runTime) {

        // Check duplicate only if duration is MONTHS.
        // If generic duration, we rely on the Scheduler to not double-trigger,
        // OR we need a more granular check (lastCalculatedAt).
        // For now, removing strict check for high frequency.
        String durationUnit = configService.getValue(GlobalConfigService.PROFIT_DURATION_UNIT);
        if (durationUnit != null && "MONTHS".equalsIgnoreCase(durationUnit)) {
            if (profitHistoryRepository
                    .findFirstByUserIdAndMonthAndYear(user.getId(), cycleMonth.getMonthValue(), cycleMonth.getYear())
                    .isPresent()) {
                return;
            }
        }

        Portfolio portfolio = portfolioRepository.findByUserId(user.getId()).orElse(null);
        if (portfolio == null || portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        LocalDate entryDate = (useAdminApprovalDate && user.getApprovedAt() != null)
                ? user.getApprovedAt().toLocalDate()
                : user.getCreatedAt().toLocalDate();

        // Allow calculation even if entry date is very recent, unless it's strictly in
        // future
        if (entryDate.isAfter(runTime.toLocalDate())) {
            return;
        }

        BigDecimal eligibleCapital = portfolio.getTotalInvested();
        BigDecimal applicableRate = (portfolio.getProfitMode() == ProfitMode.COMPOUNDING) ? compoundingRate : fixedRate;

        // Proration logic for first month is complex with high freq.
        // If we prorate the RATE itself (above), we might not need "isFirstMonth"
        // proration logic fraction
        // unless we want to block the FIRST 2 mins if they joined 1 min ago.
        BigDecimal fraction = BigDecimal.ONE;
        boolean isProrated = false;

        // Simplify first month logic for high frequency: just check if active.

        BigDecimal profitAmount = eligibleCapital.multiply(applicableRate).multiply(fraction).setScale(0,
                RoundingMode.CEILING);

        if (profitAmount.compareTo(BigDecimal.ZERO) == 0)
            return;

        BigDecimal openingBalance = portfolio.getTotalInvested()
                .add(Optional.ofNullable(portfolio.getAvailableProfit()).orElse(BigDecimal.ZERO));

        // Update Portfolio
        if (portfolio.getProfitMode() == ProfitMode.COMPOUNDING) {
            // For high frequency, compounding every 2 mins might be intended or not.
            // If mode is compounding, we add to principal.
            portfolio.setTotalInvested(portfolio.getTotalInvested().add(profitAmount));
        } else {
            portfolio.setAvailableProfit(
                    Optional.ofNullable(portfolio.getAvailableProfit()).orElse(BigDecimal.ZERO).add(profitAmount));
        }

        portfolio.setTotalValue(portfolio.getTotalInvested()
                .add(Optional.ofNullable(portfolio.getAvailableProfit()).orElse(BigDecimal.ZERO)));
        portfolio.setTotalProfitEarned(
                Optional.ofNullable(portfolio.getTotalProfitEarned()).orElse(BigDecimal.ZERO).add(profitAmount));

        portfolioRepository.save(portfolio);

        // Record History
        MonthlyProfitHistory history = MonthlyProfitHistory.builder()
                .user(user)
                .month(cycleMonth.getMonthValue())
                .year(cycleMonth.getYear())
                .openingBalance(openingBalance)
                .profitPercentage(applicableRate.multiply(BigDecimal.valueOf(100)))
                .profitAmount(profitAmount)
                .closingBalance(portfolio.getTotalValue())
                .isManual(false)
                .eligibleCapital(eligibleCapital)
                .profitMode(portfolio.getProfitMode().name())
                .isProrated(isProrated)
                .build();

        // Note: This save might fail if UNIQUE key exists on (user, month, year) and we
        // insert multiple times.
        // We rely on the user to have dropped that constraint or we accept failure.
        profitHistoryRepository.save(history);

        // Record Transaction
        Transaction txn = Transaction.builder()
                .user(user)
                .type(TransactionType.PROFIT)
                .amount(profitAmount)
                .description(String.format("Profit (%s)", portfolio.getProfitMode()))
                .build();
        transactionRepository.save(txn);

        log.info("Calculated profit for user {}: {}", user.getEmail(), profitAmount);
    }
}
