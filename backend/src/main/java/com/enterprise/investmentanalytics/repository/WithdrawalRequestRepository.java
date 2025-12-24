package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.entity.WithdrawalRequest;
import com.enterprise.investmentanalytics.model.enums.WithdrawalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, UUID> {

    List<WithdrawalRequest> findByUserOrderByCreatedAtDesc(User user);

    List<WithdrawalRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status);

    List<WithdrawalRequest> findAllByOrderByCreatedAtDesc();
}
