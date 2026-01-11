package com.enterprise.investmentanalytics.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "monthly_profit_history", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "month", "year" })
})
public class MonthlyProfitHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private User user;

    @Column(nullable = false)
    private int month;

    @Column(nullable = false)
    private int year;

    @Column(name = "opening_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal openingBalance;

    @Column(name = "profit_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal profitPercentage;

    @Column(name = "profit_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal profitAmount;

    @Column(name = "closing_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal closingBalance;

    @Column(name = "is_manual", nullable = false)
    private boolean isManual;

    @CreationTimestamp
    @Column(name = "calculated_at", updatable = false)
    private LocalDateTime calculatedAt;
}
