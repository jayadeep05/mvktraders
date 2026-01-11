package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.model.entity.GlobalConfiguration;
import com.enterprise.investmentanalytics.repository.GlobalConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GlobalConfigService {

    private final GlobalConfigRepository configRepository;

    // Keys
    public static final String FIXED_MONTHLY_RATE_PERCENT = "FIXED_MONTHLY_RATE_PERCENT";
    public static final String COMPOUNDING_MONTHLY_RATE_PERCENT = "COMPOUNDING_MONTHLY_RATE_PERCENT";
    public static final String PROFIT_CALCULATION_PERIOD = "PROFIT_CALCULATION_PERIOD";
    public static final String PAYOUT_WINDOW_START_DAY = "PAYOUT_WINDOW_START_DAY";
    public static final String PAYOUT_WINDOW_END_DAY = "PAYOUT_WINDOW_END_DAY";
    public static final String USE_FIRST_MONTH_PRORATION = "USE_FIRST_MONTH_PRORATION";
    public static final String FIRST_MONTH_PRORATION_METHOD = "FIRST_MONTH_PRORATION_METHOD"; // DAY_BASED | SLAB_BASED
    public static final String MONTHLY_CUTOFF_DAY = "MONTHLY_CUTOFF_DAY";
    public static final String USE_ADMIN_APPROVAL_DATE_AS_ENTRY_DATE = "USE_ADMIN_APPROVAL_DATE_AS_ENTRY_DATE";
    public static final String ALLOW_EARLY_EXIT_FOR_COMPOUNDING = "ALLOW_EARLY_EXIT_FOR_COMPOUNDING";
    public static final String EXIT_EFFECTIVE_NEXT_CYCLE = "EXIT_EFFECTIVE_NEXT_CYCLE";

    @PostConstruct
    public void initDefaults() {
        // Seed default values if not present
        seedIfNotExists(FIXED_MONTHLY_RATE_PERCENT, "4.0", "Fixed monthly profit percentage");
        seedIfNotExists(COMPOUNDING_MONTHLY_RATE_PERCENT, "3.6", "Compounding monthly profit percentage");
        seedIfNotExists(PROFIT_CALCULATION_PERIOD, "MONTHLY", "Calculation period (MONTHLY)");
        seedIfNotExists(PAYOUT_WINDOW_START_DAY, "5", "Start day of payout window");
        seedIfNotExists(PAYOUT_WINDOW_END_DAY, "10", "End day of payout window");
        seedIfNotExists(USE_FIRST_MONTH_PRORATION, "true", "Enable first month proration");
        seedIfNotExists(FIRST_MONTH_PRORATION_METHOD, "DAY_BASED", "Proration method: DAY_BASED or SLAB_BASED");
        seedIfNotExists(MONTHLY_CUTOFF_DAY, "15", "Cutoff day if proration is disabled");
        seedIfNotExists(USE_ADMIN_APPROVAL_DATE_AS_ENTRY_DATE, "true", "Use admin approval date as entry date");
        seedIfNotExists(ALLOW_EARLY_EXIT_FOR_COMPOUNDING, "true", "Allow early exit for compounding portfolios");
        seedIfNotExists(EXIT_EFFECTIVE_NEXT_CYCLE, "true", "Exit effective from next cycle");
    }

    private void seedIfNotExists(String key, String defaultValue, String description) {
        if (!configRepository.findByKey(key).isPresent()) {
            configRepository.save(GlobalConfiguration.builder()
                    .key(key)
                    .value(defaultValue)
                    .description(description)
                    .build());
        }
    }

    public String getValue(String key) {
        return configRepository.findByKey(key)
                .map(GlobalConfiguration::getValue)
                .orElseThrow(() -> new RuntimeException("Config key not found: " + key));
    }

    public BigDecimal getBigDecimal(String key) {
        return new BigDecimal(getValue(key));
    }

    public boolean getBoolean(String key) {
        return Boolean.parseBoolean(getValue(key));
    }

    public int getInt(String key) {
        return Integer.parseInt(getValue(key));
    }

    @Transactional
    public void updateValue(String key, String value) {
        GlobalConfiguration config = configRepository.findByKey(key)
                .orElseThrow(() -> new RuntimeException("Config key not found: " + key));
        config.setValue(value);
        configRepository.save(config);
    }

    public Map<String, String> getAllConfigs() {
        Map<String, String> map = new HashMap<>();
        configRepository.findAll().forEach(c -> map.put(c.getKey(), c.getValue()));
        return map;
    }
}
