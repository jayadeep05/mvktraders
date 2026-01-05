package com.enterprise.investmentanalytics.model.entity;

import com.enterprise.investmentanalytics.model.enums.WithdrawalStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "payout_requests")
public class PayoutRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WithdrawalStatus status; // Reusing WithdrawalStatus (PENDING, APPROVED, REJECTED)

    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "processed_by", length = 50)
    private String processedBy;

    // Admin response details
    @Column(name = "transaction_id_reference", length = 100)
    private String transactionIdReference; // ID of the actual transaction created upon approval

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;
}
