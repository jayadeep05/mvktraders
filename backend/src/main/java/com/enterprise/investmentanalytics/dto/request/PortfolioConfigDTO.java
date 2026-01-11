package com.enterprise.investmentanalytics.dto.request;

import com.enterprise.investmentanalytics.model.enums.ProfitMode;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PortfolioConfigDTO {
    private ProfitMode profitMode;
    private BigDecimal profitPercentage;
    private Boolean isProrationEnabled;
    private Boolean allowEarlyExit;
    private LocalDate profitModeEffectiveDate; // Usually set by backend, but allowing DTO to carry it if needed for
                                               // read
}
