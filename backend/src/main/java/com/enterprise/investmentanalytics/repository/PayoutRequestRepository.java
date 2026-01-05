package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.PayoutRequest;
import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.WithdrawalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PayoutRequestRepository extends JpaRepository<PayoutRequest, UUID> {
    List<PayoutRequest> findByUserOrderByCreatedAtDesc(User user);

    List<PayoutRequest> findAllByOrderByCreatedAtDesc();

    List<PayoutRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status);
}
