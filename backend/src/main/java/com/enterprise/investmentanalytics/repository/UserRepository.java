package com.enterprise.investmentanalytics.repository;

import com.enterprise.investmentanalytics.model.entity.User;
import com.enterprise.investmentanalytics.model.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    // UserId methods
    Optional<User> findByUserId(String userId);

    boolean existsByUserId(String userId);

    Optional<User> findTopByOrderBySequentialIdDesc();

    Optional<User> findTopByUserIdStartingWithOrderByUserIdDesc(String prefix);

    List<User> findByMediator(User mediator);

    List<User> findByMediator_Id(UUID mediatorId);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.mediator.id = :mediatorId AND u.isDeleted = false")
    List<User> findAllByMediatorId(@org.springframework.data.repository.query.Param("mediatorId") UUID mediatorId);

    List<User> findByRoleAndIsDeletedFalse(Role role);

    Optional<User> findByIdAndIsDeletedFalse(UUID id);

    List<User> findByMediatorAndIsDeletedFalse(User mediator);

    long countByMediatorAndIsDeletedFalse(User mediator);

    List<User> findByIsDeletedFalse();

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u LEFT JOIN FETCH u.mediator WHERE u.isDeleted = false")
    List<User> findAllWithMediator();
}
